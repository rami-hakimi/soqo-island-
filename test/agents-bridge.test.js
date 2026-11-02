// The coding-agent bridge in main: token-checked pipe messages, hostile payloads, the user-level
// hook file (asked first, backed up, connect / disconnect), and "Open terminal" never doing more
// than asking the helper to focus a window.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const stub = require('./helpers/electron-stub');

// the agents module reads the hook files under these folders
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'soqo-agents-'));
process.env.CLAUDE_CONFIG_DIR = path.join(home, '.claude');
process.env.CODEX_HOME = path.join(home, '.codex');
fs.mkdirSync(process.env.CLAUDE_CONFIG_DIR, { recursive: true });
fs.mkdirSync(process.env.CODEX_HOME, { recursive: true });

const agents = require('../src/main/agents');
const AC = require('../src/shared/agent-config');

const sent = [];
const helperCmds = [];
const alerts = [];
agents.onAlert((a) => alerts.push(a));
agents.start((ch, data) => sent.push([ch, data]), { helperWrite: (c) => helperCmds.push(c), helperPath: 'C:\\apps\\soqo\\helper\\soqo-helper.exe', enabled: false });

const bridgeFile = () => path.join(stub._dirs.userData, 'agents-bridge.json');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const lastSnapshot = () => sent.filter(([ch]) => ch === 'agents').pop()?.[1];

test('disabled: no pipe, no bridge file; enabling creates both, disabling removes them', async () => {
  assert.equal(fs.existsSync(bridgeFile()), false);
  agents.setEnabled(true);
  await wait(200);
  const bridge = JSON.parse(fs.readFileSync(bridgeFile(), 'utf8'));
  assert.match(bridge.pipe, /^soqo-island-agents-[0-9a-f]{16}$/);
  assert.equal(bridge.token.length, 64);
  const st = await agents.status();
  assert.equal(st.listening, true);
  agents.setEnabled(false);
  assert.equal(fs.existsSync(bridgeFile()), false);
  assert.equal((await agents.status()).listening, false);
});

test('messages: only the right token, version and agent get through; hostile input is dropped', async () => {
  agents.setEnabled(true);
  await wait(150);
  const { token } = JSON.parse(fs.readFileSync(bridgeFile(), 'utf8'));
  const ok = (over = {}) => JSON.stringify({ v: 1, agent: 'claude', token, event: { session_id: 'sess-1', cwd: 'C:/p/demo', hook_event_name: 'UserPromptSubmit' }, ...over });
  sent.length = 0;
  agents.handleLine('not json');
  agents.handleLine('{"v":1}');
  agents.handleLine(ok({ token: 'x'.repeat(64) }));
  agents.handleLine(ok({ token: token.slice(0, 63) }));
  agents.handleLine(ok({ v: 2 }));
  agents.handleLine(ok({ agent: 'gemini' }));
  agents.handleLine(ok({ event: null }));
  agents.handleLine(ok({ event: { hook_event_name: 'Stop' } }));
  agents.handleLine(ok({ event: { session_id: '../x', cwd: 'C:/', hook_event_name: 'Stop' } }));
  assert.equal(sent.length, 0, 'nothing reached the island');
  agents.handleLine(ok());
  assert.equal(lastSnapshot().sessions.length, 1);
  assert.equal(lastSnapshot().sessions[0].project, 'demo');
  assert.equal(lastSnapshot().sessions[0].status, 'working');
  // a target window is kept only when it looks like one; the chain gives the terminal's name
  agents.handleLine(ok({ event: { session_id: 'sess-1', cwd: 'C:/p/demo', hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'npm test' } }, target: { hwnd: 'not a number' }, chain: ['soqo-helper', 'bash', 'claude', 'pwsh', 'WindowsTerminal'] }));
  assert.equal(lastSnapshot().sessions[0].canOpen, false);
  assert.equal(lastSnapshot().sessions[0].terminal, 'Windows Terminal');
  agents.handleLine(ok({ event: { session_id: 'sess-1', cwd: 'C:/p/demo', hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'npm test' } }, target: { hwnd: 123456, pid: 42, proc: 'WindowsTerminal', title: 'x'.repeat(500) } }));
  assert.equal(lastSnapshot().sessions[0].canOpen, true);
  // an approval request alerts; the same request reported again does not
  alerts.length = 0;
  agents.handleLine(ok({ event: { session_id: 'sess-1', cwd: 'C:/p/demo', hook_event_name: 'PermissionRequest', tool_name: 'Bash', tool_use_id: 'tu9', tool_input: { command: 'git push --force' } } }));
  agents.handleLine(ok({ event: { session_id: 'sess-1', cwd: 'C:/p/demo', hook_event_name: 'PermissionRequest', tool_name: 'Bash', tool_use_id: 'tu9', tool_input: { command: 'git push --force' } } }));
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].kind, 'approval');
  assert.equal(alerts[0].session.pending.summary, 'Bash: git push --force');
  // "Open terminal" asks the helper to focus the window and nothing else
  helperCmds.length = 0;
  assert.equal(agents.openSession('claude:sess-1'), true);
  assert.deepEqual(helperCmds, ['focus 123456']);
  assert.equal(agents.openSession('claude:nope'), false);
  assert.equal(agents.openSession({ toString: () => 'claude:sess-1' }), false, 'keys are strings');
  assert.equal(helperCmds.length, 1);
});

test('over the real pipe: one line per connection, oversized and slow clients are cut off', async () => {
  const { pipe, token } = JSON.parse(fs.readFileSync(bridgeFile(), 'utf8'));
  const send = (payload) => new Promise((resolve) => {
    const s = net.connect(`\\\\.\\pipe\\${pipe}`, () => { s.write(payload); s.end(); });
    s.on('close', resolve);
    s.on('error', resolve);
  });
  sent.length = 0;
  await send(JSON.stringify({ v: 1, agent: 'codex', token, event: { session_id: 'thr_1', cwd: 'D:/work/api', hook_event_name: 'SessionStart' } }) + '\n');
  await wait(100);
  assert.ok(lastSnapshot().sessions.some((s) => s.key === 'codex:thr_1'), 'a real pipe round trip');
  sent.length = 0;
  await send('x'.repeat(300 * 1024));
  await wait(50);
  assert.equal(sent.length, 0, 'an oversized line is dropped before parsing');
  await send(JSON.stringify({ v: 1, agent: 'codex', token, event: { session_id: 'thr_2', cwd: 'D:/w', hook_event_name: 'SessionStart' } }));
  await wait(100);
  assert.ok(lastSnapshot().sessions.some((s) => s.key === 'codex:thr_2'), 'a line without a trailing newline is handled at end of stream');
  agents.setEnabled(false);
});

// ---- the user's hook files ----
const claudeFile = path.join(process.env.CLAUDE_CONFIG_DIR, 'settings.json');
const codexFile = path.join(process.env.CODEX_HOME, 'hooks.json');
const backups = (file) => fs.readdirSync(path.dirname(file)).filter((n) => n.startsWith(`${path.basename(file)}.soqo-backup-`));

test('connect asks first: a refused dialog leaves the file untouched and makes no backup', async () => {
  const original = '{\n  "model": "opus",\n  "hooks": {\n    "Stop": [{ "hooks": [{ "type": "command", "command": "echo mine" }] }]\n  }\n}\n';
  fs.writeFileSync(claudeFile, original);
  stub._dialogResponse = 1; // Cancel
  const r = await agents.connect('claude', null);
  assert.equal(r.ok, false);
  assert.equal(r.cancelled, true);
  assert.equal(fs.readFileSync(claudeFile, 'utf8'), original);
  assert.equal(backups(claudeFile).length, 0);
  assert.equal((await agents.status()).claude.connected, false);
});

test('connect: backup first, Soqo entries added, user entries and formatting kept; disconnect restores', async () => {
  const original = fs.readFileSync(claudeFile, 'utf8');
  stub._dialogResponse = 0; // Connect
  const r = await agents.connect('claude', null);
  assert.equal(r.ok, true);
  assert.equal(backups(claudeFile).length, 1);
  assert.equal(fs.readFileSync(r.backup, 'utf8'), original, 'the backup is the file as it was');
  const text = fs.readFileSync(claudeFile, 'utf8');
  const after = JSON.parse(text);
  assert.equal(after.model, 'opus');
  assert.deepEqual(after.hooks.Stop[0], { hooks: [{ type: 'command', command: 'echo mine' }] });
  assert.equal(AC.status('claude', after, 'C:/apps/soqo/helper/soqo-helper.exe').current, true);
  assert.ok(text.startsWith('{\n  "model"'), 'two-space indent kept');
  assert.ok(text.endsWith('}\n'));
  const st = await agents.status();
  assert.equal(st.claude.connected, true);
  assert.equal(st.claude.current, true);
  assert.equal(st.claude.file, claudeFile);
  // disconnect: exactly our entries go, another backup is kept
  const d = await agents.disconnect('claude');
  assert.equal(d.ok, true);
  assert.equal(d.removed, Object.keys(AC.CLAUDE_EVENTS).length);
  assert.deepEqual(JSON.parse(fs.readFileSync(claudeFile, 'utf8')), JSON.parse(original));
  assert.equal(backups(claudeFile).length, 2);
  assert.equal((await agents.status()).claude.connected, false);
  // disconnecting again is a no-op
  assert.deepEqual(await agents.disconnect('claude'), { ok: true, removed: 0 });
  assert.equal(backups(claudeFile).length, 2);
});

test('codex: a missing hooks.json is created; project-level files are never touched', async () => {
  assert.equal(fs.existsSync(codexFile), false);
  stub._dialogResponse = 0;
  const r = await agents.connect('codex', null);
  assert.equal(r.ok, true);
  assert.equal(r.backup, null, 'nothing to back up');
  const file = JSON.parse(fs.readFileSync(codexFile, 'utf8'));
  assert.ok(file.hooks.PermissionRequest);
  assert.equal(fs.existsSync(path.join(process.cwd(), '.codex', 'hooks.json')), false);
  const d = await agents.disconnect('codex');
  assert.equal(d.ok, true);
  assert.deepEqual(JSON.parse(fs.readFileSync(codexFile, 'utf8')), {});
});

test('a hook file that is not valid JSON is reported, never overwritten', async () => {
  fs.writeFileSync(claudeFile, '{ not json');
  stub._dialogResponse = 0;
  const r = await agents.connect('claude', null);
  assert.equal(r.ok, false);
  assert.match(r.error, /JSON|token|Unexpected/i);
  assert.equal(fs.readFileSync(claudeFile, 'utf8'), '{ not json');
  const st = await agents.status();
  assert.equal(st.claude.connected, false);
  assert.ok(st.claude.error);
  assert.equal((await agents.disconnect('claude')).ok, false);
  assert.equal(fs.readFileSync(claudeFile, 'utf8'), '{ not json');
  assert.equal(await agents.connect('other', null).then((x) => x.ok), false);
});
