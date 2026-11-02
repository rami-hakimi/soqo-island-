// Focus Mode: a full-screen, distraction-free countdown the user opens on purpose (Timer tab or
// the island's menu). The view mirrors the island's timer (main relays its snapshots) and sends
// its button presses back, so the island's renderer stays the single source of truth. It is an
// ordinary focusable window: Esc, Alt+F4, Alt+Tab and every Windows shortcut work; nothing is
// kiosk-locked, and the island returns as soon as the view is closed or loses the front.
const path = require('path');
const { BrowserWindow, ipcMain } = require('electron');
const i18n = require('./i18n');

let win = null;
let last = null; // latest timer snapshot, handed to the page when it asks
/** @type {(on: boolean) => void} */
let frontCb = () => {};
/** @type {(cmd: string | { start: number }) => void} */
let cmdCb = () => {};

function open(display, snapshot) {
  if (snapshot) last = snapshot;
  if (win && !win.isDestroyed()) {
    win.show();
    win.focus();
    return;
  }
  const b = display.bounds;
  win = new BrowserWindow({
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    frame: false,
    fullscreen: true,
    show: false,
    backgroundColor: '#07111d',
    title: i18n.t('fm.title'),
    icon: path.join(__dirname, '..', '..', 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'focus.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.setMenu(null);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.loadFile(path.join(__dirname, '..', 'renderer', 'focus', 'index.html'));
  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });
  win.on('focus', () => frontCb(true));
  win.on('blur', () => frontCb(false));
  win.on('closed', () => {
    win = null;
    frontCb(false);
  });
}

function close() {
  if (win && !win.isDestroyed()) win.close();
}

function send(channel, data) {
  if (channel === 'timer') last = data;
  if (win && !win.isDestroyed()) win.webContents.send(channel, data);
}

const isOpen = () => !!(win && !win.isDestroyed());

ipcMain.handle('focus-timer', () => last);
// only the view's own page may drive the timer; the shapes are checked here
ipcMain.on('focus-cmd', (e, cmd) => {
  if (!win || BrowserWindow.fromWebContents(e.sender) !== win) return;
  if (cmd === 'exit') return close();
  if (cmd === 'toggle' || cmd === 'cancel' || cmd === 'session') cmdCb(cmd);
  else if (cmd && typeof cmd === 'object' && Number.isInteger(cmd.start) && cmd.start >= 1 && cmd.start <= 180) cmdCb({ start: cmd.start });
});

module.exports = { open, close, send, isOpen, onFront: (fn) => { frontCb = fn; }, onCommand: (fn) => { cmdCb = fn; } };
