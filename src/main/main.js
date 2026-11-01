const {
  app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage, globalShortcut, desktopCapturer, shell, dialog, powerMonitor, session,
} = require('electron');
const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');

// the package root (package.json, build/, helper/, assets/); this file lives in src/main/
const ROOT = path.join(__dirname, '..', '..');

// Data folder: %APPDATA%\soqo-island, shared by the installed app and dev runs. The first run
// copies the settings of a Nova Island installation (dynamic-nova) so nothing is lost; that
// folder itself is left untouched. Must run before any module below reads
// app.getPath('userData'). SOQO_USER_DATA (dev and test runs only) points at an isolated folder.
const DATA_DIR = !app.isPackaged && process.env.SOQO_USER_DATA
  ? path.resolve(process.env.SOQO_USER_DATA)
  : path.join(app.getPath('appData'), 'soqo-island');
app.setPath('userData', DATA_DIR);
const migrate = require('./migrate');
// SOQO_MIGRATE_FROM (unpackaged runs only) points the import at a test folder
const OLD_DATA = !app.isPackaged && process.env.SOQO_MIGRATE_FROM ? path.resolve(process.env.SOQO_MIGRATE_FROM) : path.join(app.getPath('appData'), 'dynamic-nova');
const freshInstall = !fs.existsSync(path.join(DATA_DIR, 'settings.json')) && !fs.existsSync(path.join(DATA_DIR, 'features.json'));
const migratedFrom = migrate.userData(OLD_DATA, DATA_DIR);
const log = require('./log');
log.init();
if (migratedFrom) log.info(`settings copied from ${migratedFrom}`);

const settings = require('./settings');
const apps = require('./apps');
const shelf = require('./shelf');
const system = require('./system');
const mini = require('./mini');
const prayer = require('./prayer');
const downloads = require('./downloads');
const features = require('./features');
const privacy = require('./privacy');
const calendar = require('./calendar');
const network = require('./network');
const prefsWindow = require('./prefs-window');
const updater = require('./updater');
const i18n = require('./i18n');
i18n.setSetting(features.get().lang);
const t = (key, params) => i18n.t(key, params);

// Keep our own windows (the mini player) out of Windows' media sessions, so the island and
// the per-app commands keep targeting the browser tab rather than the mini player.
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling');

const WIN_W = 640;
const WIN_H = 356;
const HOVER_INTENT_MS = 280;

let win = null;
let tray = null;
let media = null;
let quitting = false;
let userHidden = false;
let fullscreenHidden = false;
let prefs = Object.assign(
  { ax: null, ay: null, docked: false, vertical: false, side: 'right' },
  settings.load('settings.json', {})
);
if (freshInstall && !migratedFrom && prefs.onboardingPending === undefined) prefs.onboardingPending = true;

// The island's position is an "anchor": the top-center of the collapsed pill, in screen
// coordinates. The window (always fully on screen) follows it, and the renderer places the
// island inside the window so it expands toward the free space near screen edges.
const PILL_HALF_W = 120;   // half of the widest collapsed pill (keep in sync with style.css)
const PILL_H = 34;
const FLOAT_TOP = 8;       // gap above a floating island inside the window (at the screen top)
const HEADROOM = 44;       // room above a floating island lower down, where Soqi can peek out
const SNAP_PX = 28;        // distance from the top edge that docks the island
const CENTER_SNAP_PX = 40; // horizontal magnet to the screen center while docked
// In vertical mode the anchor is the middle of the pill on the left or right screen edge.
const V_PILL_HALF_H = 124;

let anchor = null;
let lastLayout = '';

if (!app.requestSingleInstanceLock()) app.quit();

// Pages never open windows or navigate inside the app; web links go to the default browser.
function lockNavigation(contents, isOwnPage) {
  const external = (url) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
  };
  contents.setWindowOpenHandler(({ url }) => {
    external(url);
    return { action: 'deny' };
  });
  contents.on('will-navigate', (e, url) => {
    if (isOwnPage(url)) return;
    e.preventDefault();
    external(url);
  });
}

function send(channel, data) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, data);
}

function defaultAnchor() {
  const { bounds } = screen.getPrimaryDisplay();
  return { x: bounds.x + bounds.width / 2, y: bounds.y + FLOAT_TOP };
}

function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}

// IPC arguments come from a renderer: only the expected shapes get through.
const isStr = (v, max = 4096) => typeof v === 'string' && v.length <= max;
const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

// Clamp the anchor to the display, position the window around it and tell the renderer
// where the pill sits inside the window.
// --- the address bar slot ---
// While a Chromium browser is in front the island takes the right third of its address bar
// (the user's split: two thirds for the address, one third for the island); it shrinks to a
// thin line while the user types there. The user's own position is untouched and comes back
// as soon as the browser isn't in front.
// Only from the island's default place: never while vertical or after the user put it somewhere.
let omni = null;
let omniKey = '';
const omniAllowed = () => features.get().addrIsland && !prefs.vertical && !prefs.placed;
function onOmni(o) {
  const next = o && omniAllowed() ? o : null;
  const key = next ? `${next.x},${next.y},${next.w},${next.h},${next.focus}` : '';
  if (key === omniKey) return;
  omniKey = key;
  omni = next;
  layout();
}

function layoutAddressBar() {
  // the helper reports physical pixels; Electron places windows in DIPs
  const r = screen.screenToDipRect(null, { x: omni.x, y: omni.y, width: omni.w, height: omni.h });
  const b = screen.getDisplayMatching(r).bounds;
  const third = r.width / 3;
  const sh = Math.round(Math.min(30, Math.max(22, r.height + 6)));
  const sw = Math.round(Math.min(third - 12, 380));
  const cx = r.x + r.width - third / 2; // centre of the right third
  const top = Math.round(r.y + r.height / 2 - sh / 2);
  const wx = Math.round(clamp(cx - WIN_W / 2, b.x, b.x + b.width - WIN_W));
  const wy = Math.round(clamp(top - FLOAT_TOP, b.y, b.y + b.height - WIN_H));
  const cur = win.getBounds();
  if (cur.x !== wx || cur.y !== wy || cur.width !== WIN_W || cur.height !== WIN_H) {
    win.setBounds({ x: wx, y: wy, width: WIN_W, height: WIN_H });
  }
  const msg = {
    x: Math.round(cx - wx), y: top - wy, docked: false, vertical: false, side: prefs.side,
    addr: omni.focus ? 'line' : 'slim', sw, sh,
  };
  const key = JSON.stringify(msg);
  if (key !== lastLayout) {
    lastLayout = key;
    send('anchor', msg);
  }
}

function layout() {
  if (!win || !anchor) return;
  // not while the user drags the island somewhere else
  if (omni && !drag && omniAllowed()) {
    layoutAddressBar();
    return;
  }
  const display = screen.getDisplayNearestPoint({ x: Math.round(anchor.x), y: Math.round(anchor.y) });
  const b = display.bounds;
  const wa = display.workArea;
  let wx;
  let wy;
  if (prefs.vertical) {
    anchor.x = prefs.side === 'left' ? b.x : b.x + b.width;
    anchor.y = clamp(anchor.y, wa.y + V_PILL_HALF_H, wa.y + wa.height - V_PILL_HALF_H);
    wx = prefs.side === 'left' ? b.x : b.x + b.width - WIN_W;
    wy = Math.round(clamp(anchor.y - WIN_H / 2, wa.y, wa.y + wa.height - WIN_H));
  } else {
    anchor.x = clamp(anchor.x, b.x + PILL_HALF_W, b.x + b.width - PILL_HALF_W);
    anchor.y = prefs.docked ? b.y : clamp(anchor.y, b.y, wa.y + wa.height - PILL_H - 6);
    wx = Math.round(clamp(anchor.x - WIN_W / 2, b.x, b.x + b.width - WIN_W));
    wy = Math.round(prefs.docked ? b.y : clamp(anchor.y - HEADROOM, b.y, wa.y + wa.height - WIN_H));
  }
  const cur = win.getBounds();
  if (cur.x !== wx || cur.y !== wy || cur.width !== WIN_W || cur.height !== WIN_H) {
    win.setBounds({ x: wx, y: wy, width: WIN_W, height: WIN_H });
  }
  const msg = {
    x: Math.round(anchor.x - wx),
    y: Math.round(anchor.y - wy),
    docked: !prefs.vertical && prefs.docked,
    vertical: prefs.vertical,
    side: prefs.side,
  };
  const key = JSON.stringify(msg);
  if (key !== lastLayout) {
    lastLayout = key;
    send('anchor', msg);
  }
}

function placeWindow() {
  if (!win) return;
  anchor = Number.isFinite(prefs.ax) && Number.isFinite(prefs.ay) ? { x: prefs.ax, y: prefs.ay } : defaultAnchor();
  // settings from before "placed" existed: judge by where the island is
  if (typeof prefs.placed !== 'boolean') prefs.placed = !atDefaultPlace();
  layout();
}

// the island's own spot: horizontal, at the top, centered on its display
function atDefaultPlace() {
  if (prefs.vertical || !anchor) return false;
  const b = screen.getDisplayNearestPoint({ x: Math.round(anchor.x), y: Math.round(anchor.y) }).bounds;
  return Math.abs(anchor.x - (b.x + b.width / 2)) < 2 && anchor.y - b.y <= FLOAT_TOP + 2;
}

function savePosition() {
  prefs.ax = Math.round(anchor.x);
  prefs.ay = Math.round(anchor.y);
  settings.save('settings.json', prefs);
}

function resetPosition() {
  prefs.docked = false;
  prefs.vertical = false;
  prefs.placed = false;
  anchor = defaultAnchor();
  layout();
  savePosition();
  notifyGeneral();
}

// Switch between the horizontal island and a vertical one docked to the nearest side.
function setVertical(on) {
  if (!anchor || on === prefs.vertical) return;
  const b = screen.getDisplayNearestPoint({ x: Math.round(anchor.x), y: Math.round(anchor.y) }).bounds;
  if (on) {
    prefs.side = anchor.x < b.x + b.width / 2 ? 'left' : 'right';
    anchor = { x: anchor.x, y: anchor.y + V_PILL_HALF_H };
  } else {
    prefs.docked = false;
    const x = prefs.side === 'left' ? b.x + 260 : b.x + b.width - 260;
    anchor = { x, y: anchor.y - V_PILL_HALF_H };
  }
  prefs.vertical = on;
  // leaving the address bar at once (it would otherwise stay until the bar itself changes)
  if (on) {
    omni = null;
    omniKey = '';
  }
  layout();
  savePosition();
  notifyGeneral();
}

// --- dragging ---
// The renderer reports drag start/end; while dragging the window follows the cursor.
let drag = null;
let dragFrom = null;
ipcMain.on('drag-start', () => {
  if (!win || drag || !anchor) return;
  const p = screen.getCursorScreenPoint();
  dragFrom = { ...anchor };
  // grab the (shrinking) pill near where it was pressed so it stays under the cursor
  const ox = clamp(p.x - anchor.x, -PILL_HALF_W + 16, PILL_HALF_W - 16);
  const oy = prefs.vertical
    ? clamp(p.y - anchor.y, -V_PILL_HALF_H + 20, V_PILL_HALF_H - 20)
    : clamp(p.y - anchor.y, 4, PILL_H - 6);
  drag = { ox, oy, timer: setInterval(followCursor, 8) };
});

function followCursor() {
  if (!drag || !win || win.isDestroyed()) return;
  const p = screen.getCursorScreenPoint();
  const b = screen.getDisplayNearestPoint(p).bounds;
  if (prefs.vertical) {
    // slides along the edge; crossing the middle of the screen moves it to the other side
    prefs.side = p.x < b.x + b.width / 2 ? 'left' : 'right';
    anchor = { x: p.x, y: p.y - drag.oy };
    layout();
    return;
  }
  const next = { x: p.x - drag.ox, y: p.y - drag.oy };
  const docked = next.y - b.y < SNAP_PX;
  if (docked) {
    next.y = b.y;
    const center = b.x + b.width / 2;
    if (Math.abs(next.x - center) < CENTER_SNAP_PX) next.x = center;
  }
  prefs.docked = docked;
  anchor = next;
  layout();
}

ipcMain.on('drag-end', () => {
  if (!drag) return;
  clearInterval(drag.timer);
  drag = null;
  // a real move decides whether the island stays where the user put it (no address-bar jump)
  if (dragFrom && Math.hypot(anchor.x - dragFrom.x, anchor.y - dragFrom.y) > 20) prefs.placed = !atDefaultPlace();
  dragFrom = null;
  savePosition();
  captureBackdrop(); // refresh the glass for the new spot right away
  // don't pop the island open right after a move; re-arm when the cursor leaves
  suppressUntilLeave = true;
  send('hover', false);
});

let timerRunning = false; // reported by the island; with timerOnTop a running timer stays visible in full screen
ipcMain.on('timer-state', (_e, on) => {
  if (typeof on !== 'boolean' || on === timerRunning) return;
  timerRunning = on;
  updateVisibility();
});

function updateVisibility() {
  if (!win) return;
  const keepForTimer = timerRunning && features.get().timerOnTop;
  const shouldShow = !userHidden && !(fullscreenHidden && features.get().hideFullscreen && !keepForTimer);
  if (shouldShow && !win.isVisible()) win.showInactive();
  if (!shouldShow && win.isVisible()) win.hide();
  send('visibility', shouldShow);
}

function createWindow() {
  win = new BrowserWindow({
    width: WIN_W,
    height: WIN_H,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    show: false,
    backgroundColor: '#00000000',
    icon: path.join(ROOT, 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(ROOT, 'src', 'preload', 'island.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true);
  win.setIgnoreMouseEvents(true);
  // keep the island out of screen captures so the glass backdrop shows what is behind it
  win.setContentProtection(true);
  placeWindow();
  win.webContents.on('preload-error', (_e, p, err) => console.error('[preload-error]', p, err));
  win.webContents.on('console-message', (e, level, message, line, source) => {
    // Electron 35+ passes one event object with string levels; older versions passed arguments
    const lv = typeof e.level === 'string' ? e.level : level;
    const msg = e.message ?? message;
    const src = e.sourceId ?? source;
    const ln = e.lineNumber ?? line;
    if (lv === 'warning' || lv === 'error' || (typeof lv === 'number' && lv >= 2)) console.error('[renderer]', msg, src ? `(${path.basename(src)}:${ln})` : '');
  });
  // absolute: when started through the resources/app stub the app root isn't this folder
  lockNavigation(win.webContents, (url) => url.startsWith('file:'));
  win.loadFile(path.join(ROOT, 'src', 'renderer', 'island', 'index.html'));
  win.webContents.on('did-finish-load', () => {
    lastLayout = '';
    layout();
  });
  win.once('ready-to-show', () => win.showInactive());
}

// --- system bridge: helper/soqo-helper.exe (SMTC media, volume, brightness, fullscreen,
// window in front, keyboard, clipboard sequence, idle time). Compiled C#, no PowerShell. ---
function scriptPath(name) {
  return path.join(ROOT, name).replace('app.asar', 'app.asar.unpacked');
}
const HELPER = () => scriptPath(path.join('helper', 'soqo-helper.exe'));

// Health of the bridge, shown in Settings (antivirus may block the helper).
const bridge = { state: 'starting', detail: '', lastLine: 0, engine: 'helper' };
function bridgeStatus() {
  const fresh = Date.now() - bridge.lastLine < 10000;
  return { state: fresh ? 'ok' : bridge.state === 'starting' ? 'starting' : 'failed', detail: bridge.detail, engine: bridge.engine };
}

function startMedia() {
  media = spawn(HELPER(), [], { windowsHide: true });
  let buffer = '';
  media.on('error', (err) => {
    console.error('[media] failed to start:', err.message);
    bridge.state = 'failed';
    bridge.detail = err.message;
  });
  media.stderr.setEncoding('utf8');
  media.stderr.on('data', (d) => {
    console.error('[media]', d.trim());
    bridge.detail = d.trim().split('\n')[0].slice(0, 200);
  });
  media.stdout.setEncoding('utf8');
  media.stdout.on('data', (chunk) => {
    buffer += chunk;
    let i;
    while ((i = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, i).replace(/^\uFEFF/, '').trim();
      buffer = buffer.slice(i + 1);
      if (!line.startsWith('{')) continue;
      try {
        const data = JSON.parse(line);
        bridge.lastLine = Date.now();
        bridge.state = 'ok';
        if (data.error) console.error('[media]', data.error);
        if (typeof data.clip === 'number') onClipboardSeq(data.clip, !!data.clipPriv);
        if ('omni' in data) onOmni(data.omni);
        if (typeof data.fs === 'boolean' && data.fs !== fullscreenHidden) {
          fullscreenHidden = data.fs;
          updateVisibility();
        }
        send('media', data);
      } catch {}
    }
  });
  media.on('exit', (code) => {
    media = null;
    if (Date.now() - bridge.lastLine > 10000) {
      bridge.state = 'failed';
      bridge.detail ||= `helper exited (code ${code})`;
    }
    if (!quitting) setTimeout(startMedia, 3000);
  });
}

// --- copied images (Win+Shift+S and friends) ---
// The bridge reports Windows' clipboard sequence number; the image is only read when it
// changes, so a big screenshot sitting on the clipboard costs nothing.
const { clipboard } = require('electron');
let clipSeq = null;
let lastShot = null; // nativeImage of the last copied image, until it is saved or replaced
async function onClipboardSeq(seq, isPrivate) {
  if (clipSeq === null) { clipSeq = seq; return; } // whatever was there at startup is old news
  if (seq === clipSeq) return;
  clipSeq = seq;
  system.clipboardChanged(isPrivate); // text: history and smart actions
  if (isPrivate || !features.get().screenshotToast) return;
  // Electron 44: images come from clipboard.read() items as blobs
  let img = null;
  try {
    for (const item of await clipboard.read()) {
      const type = item.types.find((t) => t.startsWith('image/'));
      if (!type) continue;
      const blob = /** @type {Blob} */ (await item.getType(type));
      img = nativeImage.createFromBuffer(Buffer.from(await blob.arrayBuffer()));
      break;
    }
  } catch (err) {
    console.error('[screenshot] read', err.message);
  }
  if (!img || img.isEmpty()) return;
  lastShot = img;
  const { width, height } = img.getSize();
  const f = features.get();
  const auto = f.shotAutoShelf && f.tabShelf;
  send('screenshot', { thumb: img.resize({ height: 72, quality: 'good' }).toDataURL(), width, height, auto });
  if (auto) shotToShelf(Date.now() + f.shotShelfMinutes * 60 * 1000);
}

// The Snipping Tool saves every capture to Pictures\Screenshots by itself: that file goes on the
// shelf (no second copy). Any other copied image is saved to Pictures\Soqo Island first.
const SNIP_WAIT_MS = 2500;
async function windowsScreenshot(since) {
  const dir = path.join(app.getPath('pictures'), 'Screenshots');
  for (let waited = 0; waited <= SNIP_WAIT_MS; waited += 250) {
    try {
      const fresh = fs.readdirSync(dir)
        .filter((n) => /\.(png|jpe?g)$/i.test(n))
        .map((n) => path.join(dir, n))
        .map((p) => ({ p, s: fs.statSync(p) }))
        .filter(({ s }) => s.size > 0 && s.mtimeMs >= since - 1500)
        .sort((a, b) => b.s.mtimeMs - a.s.mtimeMs)[0];
      if (fresh) return fresh.p;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}
async function shotToShelf(until = 0) {
  if (!lastShot) return;
  const shot = lastShot;
  const copiedAt = Date.now();
  try {
    let file = until ? await windowsScreenshot(copiedAt) : null;
    if (!file) {
      const dir = path.join(app.getPath('pictures'), 'Soqo Island');
      const pad = (n) => String(n).padStart(2, '0');
      const d = new Date();
      file = path.join(dir, `Screenshot ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.png`);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, shot.toPNG());
    }
    shelf.add([file], until);
    send('shelf', await shelf.list());
    if (!until) send('shot-saved', { name: path.basename(file) });
  } catch (err) {
    console.error('[screenshot]', err.message);
  }
}
ipcMain.on('shot-to-shelf', () => shotToShelf());

const MEDIA_CMD = /^(toggle|next|prev|mute|seek \d+(\.\d+)?|vol [01](\.\d+)?|bright \d{1,3})$/;
ipcMain.on('media-cmd', (_e, cmd) => {
  if (media && isStr(cmd, 64) && MEDIA_CMD.test(cmd)) media.stdin.write(cmd + '\n');
});

function mediaWrite(cmd) {
  if (media) media.stdin.write(cmd + '\n');
}

// --- mini player (pop a YouTube video out of the browser) ---
const BROWSER_PROCS = ['chrome', 'msedge', 'brave', 'vivaldi', 'opera'];
const APP_ID = /^[\w.!-]+$/;

function browserProc(appId) {
  const id = String(appId || '').toLowerCase();
  return BROWSER_PROCS.find((p) => id.includes(p)) || null;
}

function findTabUrl(proc, title) {
  return new Promise((resolve) => {
    const ps = spawn(HELPER(), ['yturl', proc, String(title || '').slice(0, 200)], { windowsHide: true });
    let out = '';
    const timer = setTimeout(() => ps.kill(), 10000);
    ps.on('error', () => resolve(''));
    ps.stdout.setEncoding('utf8');
    ps.stdout.on('data', (d) => (out += d));
    ps.on('exit', () => {
      clearTimeout(timer);
      try {
        const r = JSON.parse(out.replace(/^\uFEFF/, '').trim());
        resolve(r.url || '');
      } catch {
        resolve('');
      }
    });
  });
}

function youtubeId(url) {
  const m = String(url).match(/(?:[?&]v=|youtu\.be\/|\/shorts\/|\/live\/|\/embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

ipcMain.handle('mini-open', (_e, req) => (isObj(req) ? miniOpen(req) : { ok: false, error: 'bad-request' }));
async function miniOpen(req) {
  const appId = String(req?.app || '');
  const proc = browserProc(appId);
  if (!proc || !APP_ID.test(appId)) return { ok: false, error: 'not-browser' };
  const pos = Math.max(0, Number(req.pos) || 0);
  const wasPlaying = !!req.playing;

  // pause first so the tab stops exactly where the mini player will pick up
  mediaWrite(`pauseapp ${appId}`);
  const url = await findTabUrl(proc, req.title);
  const id = youtubeId(url);
  if (!id) {
    if (wasPlaying) mediaWrite(`playapp ${appId}`);
    return { ok: false, error: 'no-url' };
  }

  await mini.open({
    id,
    t: pos,
    appId,
    title: String(req.title || ''),
    onClose: (time, resume) => {
      // back in the tab at the second the mini player reached
      mediaWrite(`seekapp ${appId} ${Math.max(0, time).toFixed(2)}`);
      if (resume) setTimeout(() => mediaWrite(`playapp ${appId}`), 250);
    },
  });
  return { ok: true };
}

// --- glass backdrop ---
// CSS backdrop-filter cannot see other windows, so capture the screen area under the
// island at low resolution and let the renderer blur it.
// The backdrop is re-captured often while the island is open or changing shape, rarely while
// it sits collapsed, and not at all while hidden; an unchanged picture is not re-sent.
const CAPTURE_ACTIVE_MS = 700;
const CAPTURE_IDLE_MS = 3000;
let capturing = false;
let captureTimer = null;
let lastCaptureKey = '';
let busyUntil = 0; // shape changed recently
function scheduleCapture(ms) {
  clearTimeout(captureTimer);
  captureTimer = setTimeout(async () => {
    await captureBackdrop();
    scheduleCapture(active || Date.now() < busyUntil ? CAPTURE_ACTIVE_MS : CAPTURE_IDLE_MS);
  }, ms);
}
async function captureBackdrop() {
  // skipped while dragging: a capture blocks the main thread and makes the move stutter;
  // never while the user turned the live glass off (Settings › Privacy)
  if (!features.get().liveGlass || capturing || drag || !win || win.isDestroyed() || !win.isVisible()) return;
  capturing = true;
  try {
    const display = screen.getDisplayMatching(win.getBounds());
    const scale = 1 / 3;
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.round(display.bounds.width * scale),
        height: Math.round(display.bounds.height * scale),
      },
    });
    const src = sources.find((s) => s.display_id === String(display.id)) || sources[0];
    if (!src || src.thumbnail.isEmpty()) return;
    const k = src.thumbnail.getSize().width / display.bounds.width;
    const b = win.getBounds();
    const crop = src.thumbnail.crop({
      x: Math.round((b.x - display.bounds.x) * k),
      y: Math.round((b.y - display.bounds.y) * k),
      width: Math.round(b.width * k),
      height: Math.round(b.height * k),
    });
    // cheap fingerprint: sample the small bitmap instead of hashing all of it
    const bmp = crop.toBitmap();
    let key = `${bmp.length}`;
    for (let i = 0; i < bmp.length; i += 997) key += bmp[i].toString(36);
    if (key === lastCaptureKey) return;
    lastCaptureKey = key;
    send('backdrop', crop.toDataURL());
  } catch (err) {
    console.error('[backdrop]', err.message);
  } finally {
    capturing = false;
  }
}

// --- hover detection with intent ---
// Forwarded mouse events are unreliable on transparent windows, so poll the cursor.
// The island only becomes interactive after the cursor rests on it, so a quick sweep
// to a browser tab underneath never gets caught.
let islandRect = { x: 0, y: 0, width: 0, height: 0 };
let inside = false;
let active = false;
let enteredAt = 0;
let suppressUntilLeave = false;

ipcMain.on('island-rect', (_e, r) => {
  if (!isObj(r) || ![r.x, r.y, r.width, r.height].every((n) => Number.isFinite(n))) return;
  const resized = r.width !== islandRect.width || r.height !== islandRect.height;
  islandRect = r;
  if (resized) {
    busyUntil = Date.now() + 2000;
    scheduleCapture(120);
  }
});

function setActive(on) {
  if (on === active) return;
  active = on;
  win.setIgnoreMouseEvents(!on);
  if (on) scheduleCapture(60);
  if (!on && win.isFocusable()) win.setFocusable(false);
  send('hover', on);
}

// Soqi's eyes follow the cursor while it is near the island (sent only on real movement).
const NEAR_PX = 260;
let nearSent = null;
function sendNear(x, y) {
  if (!features.get().soqiEyes || !islandRect.width) return;
  const dx = Math.round(x - (islandRect.x + islandRect.width / 2));
  const dy = Math.round(y - (islandRect.y + islandRect.height / 2));
  const near = Math.hypot(dx, dy) < NEAR_PX;
  if (!near) {
    if (nearSent) send('near', null);
    nearSent = null;
    return;
  }
  if (nearSent && Math.abs(nearSent.dx - dx) < 3 && Math.abs(nearSent.dy - dy) < 3) return;
  nearSent = { dx, dy };
  send('near', nearSent);
}

function pollCursor() {
  if (!win || win.isDestroyed() || !win.isVisible() || drag) return;
  const p = screen.getCursorScreenPoint();
  const b = win.getBounds();
  const x = p.x - b.x;
  const y = p.y - b.y;
  sendNear(x, y);
  const pad = active ? 8 : 2;
  const now =
    x >= islandRect.x - pad &&
    x <= islandRect.x + islandRect.width + pad &&
    y >= islandRect.y - pad &&
    y <= islandRect.y + islandRect.height + pad;
  if (now && !inside) enteredAt = Date.now();
  inside = now;
  if (!now) {
    suppressUntilLeave = false;
    setActive(false);
  } else if (!active && !suppressUntilLeave && Date.now() - enteredAt >= HOVER_INTENT_MS) {
    setActive(true);
  }
}

// Text inputs (app search) need keyboard focus; the window is otherwise non-focusable.
ipcMain.on('focus-input', (_e, on) => {
  if (!win || typeof on !== 'boolean') return;
  win.setFocusable(!!on);
  if (on) win.focus();
});

// --- apps ---
ipcMain.handle('apps-list', () => apps.list());
ipcMain.handle('apps-all', () => apps.all());
ipcMain.on('apps-add', (_e, id) => { if (isStr(id, 512)) apps.add(id); });
ipcMain.on('apps-remove', (_e, id) => { if (isStr(id, 512)) apps.remove(id); });
ipcMain.on('apps-launch', (_e, id) => { if (isStr(id, 512)) apps.launch(id); });
ipcMain.on('apps-reorder', (_e, ids) => { if (Array.isArray(ids) && ids.every((id) => isStr(id, 512))) apps.reorder(ids); });

// --- shelf ---
const shelfChanged = async () => send('shelf', await shelf.list());
ipcMain.handle('shelf-list', () => shelf.list());
ipcMain.on('shelf-add', (_e, paths) => {
  if (Array.isArray(paths) && paths.length <= 64 && paths.every((p) => isStr(p, 1024))) shelf.add(paths);
  shelfChanged();
});
ipcMain.on('shelf-remove', (_e, p) => { if (isStr(p, 1024)) { shelf.remove(p); shelfChanged(); } });
ipcMain.on('shelf-clear', () => { shelf.clear(); shelfChanged(); });
ipcMain.on('shelf-open', (_e, p) => { if (isStr(p, 1024)) shelf.open(p); });
ipcMain.on('shelf-reveal', (_e, p) => { if (isStr(p, 1024)) shelf.reveal(p); });
ipcMain.on('shelf-drag', (e, p) => { if (isStr(p, 1024)) shelf.startDrag(e.sender, p); });

// --- system ---
ipcMain.handle('system-snapshot', () => system.snapshot());
ipcMain.on('clip-copy', (_e, i) => { if (isInt(i, 0, 64)) system.copyClip(i); });
ipcMain.on('clip-clear', () => system.clearClips());
ipcMain.handle('prayer-snapshot', () => prayer.snapshot());
ipcMain.handle('prayer-info', () => prayer.info());
ipcMain.handle('prayer-methods', () => Object.entries(prayer.METHODS).map(([key, m]) => ({ key, name: m.name })));
// first run of a fresh installation: the island shows a short welcome once (no religious content)
ipcMain.handle('onboarding-get', () => ({ pending: !!prefs.onboardingPending }));
ipcMain.on('onboarding-done', () => {
  if (!prefs.onboardingPending) return;
  prefs.onboardingPending = false;
  settings.save('settings.json', prefs);
});

// --- IDM (download manager) downloads ---
ipcMain.handle('dl-snapshot', () => downloads.snapshot());
ipcMain.on('dl-control', (_e, id, action) => { if (isStr(action, 32)) downloads.control(isStr(id, 2048) ? id : '', action); });

// --- start with Windows / setup ---
// Start with Windows = a shortcut in the user's Startup folder (works for both the dev
// launch "electron.exe <folder>" and a packaged build).
function startupLink() {
  return path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'Soqo Island.lnk');
}

function shortcutOptions() {
  return {
    target: process.execPath,
    args: app.isPackaged ? '' : `"${ROOT}"`,
    cwd: ROOT,
    icon: path.join(ROOT, 'build', 'icon.ico'),
    iconIndex: 0,
    description: 'Soqo Island',
  };
}

// Installed builds use the system login item; a dev run ("electron.exe <folder>") keeps the
// shortcut in the Startup folder, since the login item would only start bare Electron.
function startsWithWindows() {
  return app.isPackaged ? app.getLoginItemSettings().openAtLogin : fs.existsSync(startupLink());
}

function setStartWithWindows(on) {
  // the choice is also kept in settings.json, so an update (which re-runs the installer) or a
  // lost registry value can be repaired at the next start (see restoreStartup)
  prefs.startWithWindows = !!on;
  settings.save('settings.json', prefs);
  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: on });
    return on;
  }
  const link = startupLink();
  if (!on) {
    try { fs.unlinkSync(link); } catch {}
    return false;
  }
  return shell.writeShortcutLink(link, 'create', shortcutOptions());
}

// "Setup Soqo Island.cmd" launches the app with --setup: create the desktop icon and the
// startup entry, and write what happened to setup-log.txt next to the app.
function runSetup() {
  const lines = [`Soqo Island setup - ${new Date().toLocaleString()}`];
  const desktop = path.join(app.getPath('desktop'), 'Soqo Island.lnk');
  try {
    const ok = shell.writeShortcutLink(desktop, 'create', shortcutOptions());
    lines.push(`${ok && fs.existsSync(desktop) ? 'OK  ' : 'FAIL'} desktop shortcut: ${desktop}`);
  } catch (err) {
    lines.push(`FAIL desktop shortcut: ${err.message}`);
  }
  try {
    const ok = setStartWithWindows(true);
    lines.push(`${ok && fs.existsSync(startupLink()) ? 'OK  ' : 'FAIL'} start with Windows: ${startupLink()}`);
  } catch (err) {
    lines.push(`FAIL start with Windows: ${err.message}`);
  }
  lines.push(`app: ${process.execPath} ${ROOT}`);
  const logDir = ROOT;
  try {
    fs.writeFileSync(path.join(logDir, 'setup-log.txt'), lines.join('\r\n') + '\r\n');
  } catch {}
  console.log(lines.join('\n'));
}

app.on('second-instance', (_e, argv) => {
  if (argv.includes('--setup')) runSetup();
});

// --- menus ---
function appMenu() {
  return Menu.buildFromTemplate([
    { label: t('app.name'), enabled: false },
    { type: 'separator' },
    {
      label: t('menu.show'),
      type: 'checkbox',
      checked: !userHidden,
      click: (item) => { userHidden = !item.checked; updateVisibility(); notifyGeneral(); },
    },
    {
      label: t('menu.vertical'),
      type: 'checkbox',
      checked: prefs.vertical,
      click: (item) => setVertical(item.checked),
    },
    { label: t('menu.resetPosition'), click: resetPosition },
    {
      label: t('menu.startWithWindows'),
      type: 'checkbox',
      checked: startsWithWindows(),
      click: (item) => { setStartWithWindows(item.checked); notifyGeneral(); },
    },
    { label: t('menu.toggle'), click: () => send('toggle') },
    { label: t('menu.settings'), click: () => prefsWindow.open() },
    { type: 'separator' },
    { label: t('menu.quit'), click: () => app.quit() },
  ]);
}

ipcMain.on('context-menu', () => appMenu().popup({ window: win }));

// --- Settings window ---
// General options live in main (position, startup); feature switches live in features.js.
function generalState() {
  return { shown: !userHidden, vertical: !!prefs.vertical, startWithWindows: startsWithWindows(), version: app.getVersion() };
}
function notifyGeneral() {
  prefsWindow.send('general', generalState());
}
ipcMain.on('open-settings', () => prefsWindow.open());
// the island page reports once all its scripts ran (an early error would stop it before this)
ipcMain.on('island-ready', () => log.info('island ready'));
ipcMain.on('update-install', () => updater.install());
ipcMain.handle('features-get', () => features.get());
ipcMain.on('features-set', (_e, patch) => { if (isObj(patch)) features.set(patch); });
ipcMain.on('features-reset', () => features.reset());
ipcMain.on('reminder-preview', () => send('reminder-now'));
ipcMain.handle('general-get', () => generalState());
ipcMain.on('i18n-get-sync', (e) => { e.returnValue = i18n.payload(); });
ipcMain.handle('i18n-get', () => i18n.payload());
// Settings > Support: the page names a link, main holds the addresses
const SUPPORT_LINKS = {
  github: 'https://github.com/rami-hakimi/soqo-island-',
  upstream: 'https://github.com/NOVA-TECH-KIT/nova-island', // the project this app is based on
  developer: 'https://github.com/rami-hakimi',
  license: 'https://www.gnu.org/licenses/gpl-3.0.html',
};
ipcMain.on('open-support', (_e, key) => {
  if (isStr(key, 32) && Object.hasOwn(SUPPORT_LINKS, key)) shell.openExternal(SUPPORT_LINKS[key]);
});
ipcMain.handle('bridge-status', () => bridgeStatus());
ipcMain.on('open-log', () => {
  if (log.logPath() && fs.existsSync(log.logPath())) shell.openPath(log.logPath());
});
ipcMain.handle('copy-report', async () => {
  const f = features.get();
  const on = Object.keys(f).filter((k) => f[k] === true).length;
  const report = log.report({
    bridge: bridgeStatus(),
    location: system.locationInfo().mode,
    features: `${on} on`,
    vertical: !!prefs.vertical,
    calendar: calendar.hasUrl() ? 'linked' : 'none',
  });
  await clipboard.writeText(report);
  return true;
});
ipcMain.handle('loc-get', () => system.locationInfo());
ipcMain.handle('net-get', () => network.snapshot());
// smart clipboard: act on what main itself recognised, never on data from the page
const VIDEO_HOSTS = /(^|\.)(youtube\.com|youtu\.be|instagram\.com|tiktok\.com|x\.com|twitter\.com|facebook\.com|fb\.watch|vimeo\.com|reddit\.com|soundcloud\.com|dailymotion\.com)$/i;
ipcMain.on('clip-action', async (_e, action) => {
  if (!isStr(action, 32)) return;
  const s = system.lastSmart();
  if (!s) return;
  if (s.type === 'url' && action === 'open' && /^https?:\/\//i.test(s.url)) shell.openExternal(s.url);
  else if (s.type === 'url' && action === 'download') {
    try {
      const r = await fetch('http://127.0.0.1:17890/add', {
        method: 'POST',
        headers: downloads.idmHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({ url: s.url, media: VIDEO_HOSTS.test(new URL(s.url).hostname) }),
        signal: AbortSignal.timeout(4000),
      });
      if (r.status === 403) downloads.forgetToken();
      if (!r.ok) throw new Error(`IDM answered ${r.status}`);
    } catch {
      shell.openExternal(s.url);
    }
  } else if (s.type === 'math' && action === 'copy') system.writeQuiet(s.result);
});
// download folders watched for browser downloads (Settings > Connections)
const folderDownloads = require('./browser-downloads');
ipcMain.handle('dl-folders', () => folderDownloads.folderList());
ipcMain.handle('dl-folder-add', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const r = await dialog.showOpenDialog(win, { title: t('dialog.addFolder'), properties: ['openDirectory'] });
  return r.canceled || !r.filePaths[0] ? folderDownloads.folderList() : folderDownloads.addFolder(r.filePaths[0]);
});
ipcMain.handle('dl-folder-remove', (_e, p) => (isStr(p, 1024) ? folderDownloads.removeFolder(p) : folderDownloads.folderList()));
ipcMain.handle('cal-get', () => ({ ...calendar.snapshot(), hasUrl: calendar.hasUrl() }));
ipcMain.handle('cal-set', (_e, url) => (isStr(url, 2048) ? calendar.setUrl(url) : { ok: false }));
// only meeting links the calendar itself produced (Meet / Teams / Zoom / Webex, https)
ipcMain.on('open-meeting', (_e, link) => {
  if (isStr(link, 2048) && calendar.isJoinLink(link)) shell.openExternal(link);
});
ipcMain.handle('loc-search', async (_e, q) => {
  if (!isStr(q, 200)) return [];
  try {
    return await system.searchCity(q);
  } catch {
    return null;
  }
});
ipcMain.on('loc-set', (_e, loc) => { if (loc === null || isObj(loc)) system.setLocation(loc); });
system.onLocationChange((info) => {
  prayer.refresh();
  prefsWindow.send('location', info);
  setTimeout(() => prefsWindow.send('prayer', prayer.info()), 1500);
});
ipcMain.on('general-set', (_e, key, value) => {
  if (!isStr(key, 32)) return;
  const on = !!value;
  if (key === 'shown') {
    userHidden = !on;
    updateVisibility();
  } else if (key === 'vertical') setVertical(on);
  else if (key === 'startWithWindows') setStartWithWindows(on);
  else if (key === 'resetPosition') resetPosition();
  notifyGeneral();
});
let prayerCalc = `${features.get().asrHanafi}|${features.get().hijriAdjust}|${features.get().prayerMethod}`;
let autoUpdate = features.get().autoUpdate;
features.onChange((f) => {
  if (i18n.setSetting(f.lang)) {
    const payload = i18n.payload();
    send('i18n', payload);
    prefsWindow.send('i18n', payload);
    if (tray) tray.setToolTip(t('app.name'));
  }
  if (!f.addrIsland && omni) {
    omni = null;
    omniKey = '';
    layout();
  }
  prayer.setEnabled(f.islamic);
  const calc = `${f.asrHanafi}|${f.hijriAdjust}|${f.prayerMethod}`;
  if (calc !== prayerCalc) {
    prayerCalc = calc;
    prayer.refresh();
  }
  send('features', f);
  prefsWindow.send('features', f);
  prefsWindow.send('prayer', prayer.info());
  downloads.setEnabled(f.downloads);
  downloads.setFolders(f.folderDownloads);
  privacy.setEnabled(f.privacyDots);
  network.setEnabled(f.netToasts);
  if (f.autoUpdate !== autoUpdate) {
    autoUpdate = f.autoUpdate;
    updater.setEnabled(autoUpdate);
  }
  if (!f.clipboardHistory) system.clearClips();
  if (f.liveGlass) {
    lastCaptureKey = '';
    scheduleCapture(60);
  }
  updateVisibility();
});

function trayIcon() {
  // the dolphin silhouette in brand cyan reads on both dark and light taskbars
  const img = nativeImage.createFromPath(path.join(ROOT, 'build', 'tray-color.png'));
  if (!img.isEmpty()) return img.resize({ width: 16, height: 16, quality: 'best' });
  // fallback: white pill
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = Math.min(Math.max(x + 0.5, 4), 12);
      const inPill = Math.hypot(x + 0.5 - cx, y + 0.5 - 8) <= 3.2;
      const o = (y * size + x) * 4;
      buf[o] = buf[o + 1] = buf[o + 2] = 255;
      buf[o + 3] = inPill ? 255 : 0;
    }
  }
  return nativeImage.createFromBitmap(buf, { width: size, height: size });
}

function buildTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip(t('app.name'));
  tray.on('click', () => tray.popUpContextMenu(appMenu()));
  tray.on('right-click', () => tray.popUpContextMenu(appMenu()));
}

// Startup entries. The installed app uses a login item under its own name, a dev run a
// "Soqo Island.lnk" in the Startup folder. Nova Island's own entries are never touched: they
// belong to that installation. On the first run with copied settings its start-with-Windows
// choice is mirrored, so the preference carries over like the rest.
async function migrateStartup() {
  if (!migratedFrom) return;
  let wasOn = fs.existsSync(path.join(path.dirname(startupLink()), 'Nova Island.lnk'));
  // the installed Nova Island registers under its own value in the user's Run key; Electron's
  // API only reads this app's own entry, so look (read-only) with reg.exe
  if (!wasOn && app.isPackaged) wasOn = await runKeyHas('electron.app.Nova Island');
  if (wasOn && !startsWithWindows()) setStartWithWindows(true);
}

function runKeyHas(valueName) {
  return new Promise((resolve) => {
    execFile('reg.exe', ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', valueName],
      { windowsHide: true, timeout: 5000 }, (err, stdout) => resolve(!err && String(stdout).includes(valueName)));
  });
}

// Installed builds: the user asked for launch at startup but the Run value is gone (an update
// re-ran the installer, or the value was cleaned up): register again. A value that Windows'
// own Startup settings disabled stays present and is left alone.
function restoreStartup() {
  if (!app.isPackaged || prefs.startWithWindows !== true) return;
  try {
    if (!app.getLoginItemSettings().openAtLogin) {
      app.setLoginItemSettings({ openAtLogin: true });
      log.info('launch at startup registered again');
    }
  } catch (err) {
    console.error('[startup]', err.message);
  }
}

app.whenReady().then(() => {
  restoreStartup();
  // Pages never need a browser permission (no camera, mic, geolocation or notifications from web
  // content): deny them all, and never allow a <webview>.
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  app.on('web-contents-created', (_e, contents) => {
    contents.on('will-attach-webview', (e) => e.preventDefault());
  });
  migrateStartup();
  if (process.argv.includes('--setup')) runSetup();
  createWindow();
  buildTray();
  startMedia();
  system.start(send);
  prayer.onUpdate(() => prefsWindow.send('prayer', prayer.info()));
  prayer.start(send, system.getLocation, features.get().islamic);
  downloads.start(send, features.get().downloads, features.get().folderDownloads);
  privacy.start(send, features.get().privacyDots);
  network.start(send, features.get().netToasts);
  updater.start(send, autoUpdate);
  // waking from sleep or getting the internet back: weather, prayer times and a failed update
  // check catch up at once instead of waiting for their next timer (5 s for Wi-Fi to reconnect)
  let wakeTimer = null;
  const wake = () => {
    clearTimeout(wakeTimer);
    wakeTimer = setTimeout(() => {
      system.refreshNow();
      prayer.retry();
      updater.retrySoon();
    }, 5000);
  };
  powerMonitor.on('resume', wake);
  network.onBack(wake);
  calendar.start((ch, data) => {
    send(ch, data);
    prefsWindow.send(ch, data);
  });
  apps.init(async () => send('apps', await apps.list()));
  shelf.start(async () => send('shelf', await shelf.list()));
  setInterval(pollCursor, 40);
  scheduleCapture(300);
  globalShortcut.register('CommandOrControl+Alt+I', () => send('toggle'));
  screen.on('display-metrics-changed', () => layout());
  screen.on('display-added', () => layout());
  screen.on('display-removed', () => layout());
});

app.on('before-quit', () => {
  quitting = true;
  globalShortcut.unregisterAll();
  if (media) media.kill();
});

app.on('window-all-closed', () => app.quit());
