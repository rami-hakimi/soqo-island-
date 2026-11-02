// Windows notifications on the island (opt-in). The helper reads the toasts other apps delivered
// to Action Center through Windows' own listener API (Windows.UI.Notifications.Management) and
// reports new ones; this module keeps a short list in memory, drops the ones Windows dropped,
// never writes any of it to disk and never sends it anywhere.
//
// What arrives: the sending app's name, the toast title and (with previews on) its body. Chrome
// web notifications — WhatsApp Web among them — arrive as "Google Chrome" toasts, exactly what
// Windows shows; nothing is read from the browser itself. Windows' own "do not disturb" state
// (quiet) travels along so the island stays silent when Windows would.
const log = require('./log');

const MAX_ITEMS = 30;
/** @type {(channel: string, data?: unknown) => void} */
let send = () => {};
/** @type {(cmd: string) => void} */
let helperWrite = () => {};
let enabled = false;
let preview = true;
let access = 'off'; // off | allowed | denied | unspecified | unavailable | waiting
let quiet = false;
let items = [];
const listeners = []; // fn(item) for a fresh notification worth a toast

const clean = (v, max) => (typeof v === 'string' ? v.replace(/\p{Cc}+/gu, ' ').trim().slice(0, max) : '');

// the process a notifying app's window belongs to, for "Open app" (fixed table; never a command)
const APP_PROCS = { chrome: 'chrome', msedge: 'msedge', 'microsoft.edge': 'msedge', brave: 'brave', firefox: 'firefox', vivaldi: 'vivaldi', opera: 'opera', 'com.squirrel.discord.discord': 'Discord', 'com.squirrel.slack.slack': 'slack', 'com.squirrel.teams.teams': 'ms-teams', 'telegram.telegramdesktop': 'Telegram', '5319275a.whatsappdesktop_cv1g1gvanyjgm!app': 'WhatsApp', spotify: 'Spotify' };
function procFor(aumid, app) {
  const a = String(aumid || '').toLowerCase();
  for (const [k, p] of Object.entries(APP_PROCS)) if (a === k || a.includes(k)) return p;
  const n = String(app || '').toLowerCase();
  if (n.includes('chrome')) return 'chrome';
  if (n.includes('edge')) return 'msedge';
  if (n.includes('firefox')) return 'firefox';
  return '';
}

function onHelper(data) {
  if (!enabled) return;
  if (typeof data.notifAccess === 'string') {
    const a = clean(data.notifAccess, 20);
    if (a !== access) { access = a; log.info(`notifications: access ${a}`); publish(); }
  }
  if (typeof data.quiet === 'boolean' && data.quiet !== quiet) { quiet = data.quiet; publish(); }
  if (Array.isArray(data.notifGone) && data.notifGone.length) {
    const gone = new Set(data.notifGone.filter((n) => Number.isInteger(n)));
    const before = items.length;
    items = items.filter((i) => !gone.has(i.id));
    if (items.length !== before) publish();
  }
  if (Array.isArray(data.notif) && data.notif.length) {
    let fresh = 0;
    for (const raw of data.notif.slice(0, 10)) {
      if (!raw || typeof raw !== 'object' || !Number.isInteger(raw.id)) continue;
      if (items.some((i) => i.id === raw.id)) continue;
      const item = {
        id: raw.id, app: clean(raw.app, 80), title: clean(raw.title, 160), body: preview ? clean(raw.body, 240) : '',
        at: Number.isFinite(raw.at) && raw.at > 0 ? raw.at : Date.now(), proc: procFor(raw.aumid, raw.app),
      };
      // the same title and body from the same app within a few seconds: once
      if (items.some((i) => i.app === item.app && i.title === item.title && i.body === item.body && Math.abs(i.at - item.at) < 5000)) continue;
      items.unshift(item);
      fresh++;
      if (!quiet) listeners.forEach((fn) => fn(item));
    }
    if (items.length > MAX_ITEMS) items.length = MAX_ITEMS;
    if (fresh) publish();
  }
  if (typeof data.notifError === 'string') log.info(`notifications: ${clean(data.notifError, 120)}`);
}

function snapshot() { return { enabled, access, quiet, preview, items }; }
function publish() { send('notif', snapshot()); }

function apply() {
  if (enabled) {
    access = 'waiting';
    helperWrite(preview ? 'notif on' : 'notif on nopreview');
  } else {
    helperWrite('notif off');
    access = 'off';
    items = [];
  }
  publish();
}

function configure({ enabled: on, preview: pv }) {
  const was = `${enabled}|${preview}`;
  enabled = !!on;
  preview = pv !== false;
  if (`${enabled}|${preview}` !== was) apply();
}

// the helper restarted: ask again
function helperRestarted() { if (enabled) apply(); }

function open(id) {
  const it = items.find((i) => i.id === id);
  if (!it || !it.proc) return false;
  helperWrite(`focusproc ${it.proc}`);
  return true;
}

function dismiss(id) {
  const before = items.length;
  items = items.filter((i) => i.id !== id);
  if (items.length !== before) publish();
}

function clear() { items = []; publish(); }

function start(sender, opts) {
  send = sender;
  helperWrite = opts.helperWrite;
  enabled = !!opts.enabled;
  preview = opts.preview !== false;
  if (enabled) apply();
}

const onFresh = (fn) => listeners.push(fn);

module.exports = { start, configure, onHelper, helperRestarted, snapshot, open, dismiss, clear, onFresh };
