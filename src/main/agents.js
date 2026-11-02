// Coding agents (Claude Code, Codex CLI): the island learns about a session — started, working,
// idle, done, failed, waiting for an approval — from the agents' own hooks. Nothing is polled,
// no transcript is read, nothing is sent anywhere.
//
// How it fits together
//   - The user turns the feature on and connects an agent in Settings › Connections. Connecting
//     edits that agent's user-level hook file (asked first, backed up first, only Soqo's own
//     entries, see shared/agent-config.js) so that each lifecycle event runs
//     "soqo-helper.exe hook <agent>".
//   - That helper subcommand sends one JSON line to this process over a private named pipe. The
//     pipe name and a random token live in agents-bridge.json in the data folder (readable by
//     this Windows user only); a line without the right token is dropped. Messages are bounded
//     (256 KB, one per connection, 3 s), validated and reduced (shared/agent-events.js).
//   - The helper also reports which window the agent's terminal runs in (its own parent-process
//     chain). "Open terminal" asks the bridge helper to bring that window to the front; the
//     island never answers an approval itself: the terminal stays the only place that decides.
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { app, dialog, shell, BrowserWindow } = require('electron');
const i18n = require('./i18n');
const log = require('./log');
const AgentEvents = require('../shared/agent-events');
const AgentConfig = require('../shared/agent-config');

const BRIDGE_FILE = 'agents-bridge.json';
const MAX_LINE = AgentEvents.LIMITS.message_bytes;
const SOCKET_MS = 3000;
const MAX_CLIENTS = 32;
const BACKUPS_KEPT = 5;

/** @type {(channel: string, data?: unknown) => void} */
let send = () => {};
/** @type {(cmd: string) => void} */
let helperWrite = () => {};
let helperPath = '';
let bridgeArg = ''; // explicit bridge file for development runs with their own data folder
let enabled = false;
let hideDetails = false;
let server = null;
let pipe = '';
let token = '';
let clients = 0;
const store = AgentEvents.createStore();
const listeners = []; // alerts: fn({ kind, session })
const home = () => os.homedir();

// --- files the agents read ---
const CLAUDE_DIR = () => process.env.CLAUDE_CONFIG_DIR || path.join(home(), '.claude');
const CODEX_DIR = () => process.env.CODEX_HOME || path.join(home(), '.codex');
const FILES = {
  claude: () => path.join(CLAUDE_DIR(), 'settings.json'),
  codex: () => path.join(CODEX_DIR(), 'hooks.json'),
};

function readJson(file) {
  let text = '';
  try { text = fs.readFileSync(file, 'utf8'); } catch (err) { if (err.code !== 'ENOENT') throw err; }
  if (!text.trim()) return { data: {}, text, existed: !!text };
  return { data: JSON.parse(text), text, existed: true };
}

// a copy next to the file: settings.json.soqo-backup-20261102-153000 (the five newest are kept)
function backup(file) {
  if (!fs.existsSync(file)) return null;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
  let copy = `${file}.soqo-backup-${stamp}`;
  for (let n = 2; fs.existsSync(copy); n++) copy = `${file}.soqo-backup-${stamp}-${n}`;
  fs.copyFileSync(file, copy);
  try {
    const dir = path.dirname(file);
    const base = `${path.basename(file)}.soqo-backup-`;
    const old = fs.readdirSync(dir).filter((n) => n.startsWith(base)).sort().reverse().slice(BACKUPS_KEPT);
    for (const n of old) fs.unlinkSync(path.join(dir, n));
  } catch {}
  return copy;
}

function writeJson(file, obj, style) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.soqo-tmp`;
  fs.writeFileSync(tmp, AgentConfig.format(obj, style));
  fs.renameSync(tmp, file);
}

// --- is the agent installed at all? (where.exe, cached for a minute) ---
const found = { claude: null, codex: null, at: 0 };
function detect() {
  if (Date.now() - found.at < 60000) return Promise.resolve(found);
  found.at = Date.now();
  const look = (name) => new Promise((resolve) => {
    execFile('where.exe', [name], { windowsHide: true, timeout: 4000 }, (err, stdout) => resolve(!err && String(stdout).trim().length > 0));
  });
  return Promise.all([look('claude'), look('codex')]).then(([c, x]) => {
    found.claude = c || fs.existsSync(CLAUDE_DIR());
    found.codex = x || fs.existsSync(CODEX_DIR());
    return found;
  });
}

async function agentStatus(agent) {
  const file = FILES[agent]();
  let cfg = { connected: false, count: 0, expected: 0, current: false, paths: [] };
  let error = '';
  try { cfg = AgentConfig.status(agent, readJson(file).data, helperPath, bridgeArg); } catch (err) { error = err.message; }
  const inst = await detect();
  return { agent, file, installed: !!inst[agent], connected: cfg.connected, current: cfg.current, count: cfg.count, expected: cfg.expected, error, sessions: store.list().filter((s) => s.agent === agent).length };
}

async function status() {
  return { enabled, listening: !!server, pipe: server ? pipe : '', helper: helperPath, claude: await agentStatus('claude'), codex: await agentStatus('codex') };
}

// --- connect / disconnect: asked first, backed up first ---
const t = (k, p) => i18n.t(k, p);

async function connect(agent, sender) {
  if (!FILES[agent]) return { ok: false, error: 'unknown-agent' };
  const file = FILES[agent]();
  const win = sender ? BrowserWindow.fromWebContents(sender) : null;
  const name = AgentEvents.AGENTS[agent].name;
  const r = await dialog.showMessageBox(win || undefined, {
    type: 'question', buttons: [t('agents.connectBtn'), t('agents.cancel')], defaultId: 0, cancelId: 1, noLink: true,
    title: t('agents.connectTitle', { name }),
    message: t('agents.connectMsg', { name }),
    detail: t('agents.connectDetail', { file, name, cmd: AgentConfig.commandFor(agent, helperPath, bridgeArg) }),
  });
  if (r.response !== 0) return { ok: false, cancelled: true };
  try {
    const cur = readJson(file);
    const copy = backup(file);
    const next = AgentConfig.connect(agent, cur.data, helperPath, bridgeArg);
    writeJson(file, next, AgentConfig.styleOf(cur.text));
    log.info(`agents: ${agent} connected (${file}${copy ? `, backup ${path.basename(copy)}` : ''})`);
    return { ok: true, backup: copy, file };
  } catch (err) {
    log.info(`agents: ${agent} connect failed: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

async function disconnect(agent) {
  if (!FILES[agent]) return { ok: false, error: 'unknown-agent' };
  const file = FILES[agent]();
  try {
    const cur = readJson(file);
    if (!cur.existed) return { ok: true, removed: 0 };
    const { settings: next, removed } = AgentConfig.disconnect(cur.data);
    if (!removed) return { ok: true, removed: 0 };
    const copy = backup(file);
    writeJson(file, next, AgentConfig.styleOf(cur.text));
    log.info(`agents: ${agent} disconnected (${removed} entries removed, backup ${copy ? path.basename(copy) : 'none'})`);
    for (const key of [...store.list()].filter((s) => s.agent === agent).map((s) => s.key)) store.apply({ key, agent, sessionId: key.slice(agent.length + 1), kind: 'end', status: 'ended', at: Date.now(), summary: '', toolUseId: '' });
    publish();
    return { ok: true, removed, backup: copy };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// --- the pipe ---
function bridgeFile() { return path.join(app.getPath('userData'), BRIDGE_FILE); }

function startServer() {
  if (server) return;
  token = crypto.randomBytes(32).toString('hex');
  pipe = `soqo-island-agents-${crypto.createHash('sha256').update(`${os.userInfo().username}|${app.getPath('userData')}`).digest('hex').slice(0, 16)}`;
  server = net.createServer({ allowHalfOpen: false }, onClient);
  server.on('error', (err) => {
    log.info(`agents: pipe error ${err.message}`);
    stopServer();
  });
  server.listen(`\\\\.\\pipe\\${pipe}`, () => {
    try { fs.writeFileSync(bridgeFile(), JSON.stringify({ pipe, token, pid: process.pid, v: 1 }), { mode: 0o600 }); } catch (err) { log.info(`agents: bridge file ${err.message}`); }
    log.info(`agents: listening on ${pipe}`);
  });
}

function stopServer() {
  if (server) { try { server.close(); } catch {} }
  server = null;
  token = '';
  try { fs.unlinkSync(bridgeFile()); } catch {}
}

function onClient(sock) {
  if (clients >= MAX_CLIENTS) { sock.destroy(); return; }
  clients++;
  let buf = '';
  let done = false;
  const finish = () => { if (!done) { done = true; clients--; sock.destroy(); } };
  sock.setEncoding('utf8');
  sock.setTimeout(SOCKET_MS, finish);
  sock.on('error', finish);
  sock.on('close', finish);
  sock.on('data', (chunk) => {
    if (done) return;
    buf += chunk;
    if (buf.length > MAX_LINE) { finish(); return; }
    const nl = buf.indexOf('\n');
    if (nl < 0) return;
    const line = buf.slice(0, nl);
    finish();
    handleLine(line);
  });
  sock.on('end', () => { if (!done && buf.trim()) { const line = buf; finish(); handleLine(line); } });
}

const sameToken = (a) => typeof a === 'string' && a.length === token.length && token.length > 0 && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(token));

function handleLine(line) {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  if (!msg || typeof msg !== 'object' || msg.v !== 1 || !sameToken(msg.token)) return;
  const agent = msg.agent === 'claude' || msg.agent === 'codex' ? msg.agent : null;
  if (!agent) return;
  const ev = AgentEvents.normalize(agent, msg.event, { hideDetails });
  if (!ev) return;
  const { changed, alert, session } = store.apply(ev);
  let targetChanged = false;
  if (session) {
    const tg = msg.target;
    if (tg && typeof tg === 'object' && Number.isFinite(tg.hwnd) && tg.hwnd > 0) {
      const next = { hwnd: Math.floor(tg.hwnd), pid: Number.isInteger(tg.pid) ? tg.pid : 0, proc: AgentEvents.clean(tg.proc, 64), title: AgentEvents.clean(tg.title, 120) };
      targetChanged = !session.target || session.target.hwnd !== next.hwnd;
      session.target = next;
    }
    if (Array.isArray(msg.chain)) {
      const name = terminalName(msg.chain);
      if (name !== session.terminal) { session.terminal = name; targetChanged = true; }
    }
  }
  if (!changed && !alert && !targetChanged) return;
  publish();
  if (alert) listeners.forEach((fn) => fn({ kind: alert, session: view(session) }));
}

// a readable name for the terminal from the process chain (names only)
const TERMINALS = { windowsterminal: 'Windows Terminal', code: 'VS Code', 'code - insiders': 'VS Code', cursor: 'Cursor', windsurf: 'Windsurf', idea64: 'IntelliJ', webstorm64: 'WebStorm', pycharm64: 'PyCharm', rider64: 'Rider', conhost: 'Console', powershell: 'PowerShell', pwsh: 'PowerShell', cmd: 'Command Prompt', wezterm: 'WezTerm', 'wezterm-gui': 'WezTerm', alacritty: 'Alacritty', hyper: 'Hyper', tabby: 'Tabby', claude: 'Claude', ghostty: 'Ghostty' };
function terminalName(chain) {
  for (const raw of [...chain].reverse()) {
    const n = AgentEvents.clean(raw, 64).toLowerCase();
    if (TERMINALS[n]) return TERMINALS[n];
  }
  return '';
}

const view = (s) => s && { key: s.key, agent: s.agent, name: AgentEvents.AGENTS[s.agent].name, short: AgentEvents.AGENTS[s.agent].short, project: s.project, status: s.status, since: s.since, at: s.at, activity: s.activity, pending: s.pending, terminal: s.terminal || '', canOpen: !!(s.target && s.target.hwnd), prompts: s.prompts };
function snapshot() { return { enabled, sessions: store.list().map(view) }; }
function publish() { send('agents', snapshot()); }
setInterval(() => { if (enabled && store.size) { store.prune(); publish(); } }, 60000).unref();

// --- actions from the island ---
// Open terminal: bring the window the session runs in to the front (nothing is typed there)
function openSession(key) {
  if (typeof key !== 'string') return false;
  const s = store.get(key);
  if (!s || !s.target || !s.target.hwnd) return false;
  helperWrite(`focus ${s.target.hwnd}`);
  return true;
}

function openBackups(agent) {
  if (!FILES[agent]) return;
  shell.showItemInFolder(FILES[agent]());
}

// --- lifecycle ---
function setEnabled(on) {
  on = !!on;
  if (on === enabled) return;
  enabled = on;
  if (on) startServer();
  else { stopServer(); store.clear(); }
  publish();
}

function start(sender, opts) {
  send = sender;
  helperWrite = opts.helperWrite;
  helperPath = opts.helperPath;
  bridgeArg = opts.bridgeArg || '';
  hideDetails = !!opts.hideDetails;
  enabled = !!opts.enabled;
  if (enabled) startServer();
}

function stop() { stopServer(); }
const onAlert = (fn) => listeners.push(fn);
const setHideDetails = (v) => { hideDetails = !!v; };

module.exports = { start, stop, setEnabled, setHideDetails, status, connect, disconnect, snapshot, openSession, openBackups, onAlert, handleLine, FILES };
