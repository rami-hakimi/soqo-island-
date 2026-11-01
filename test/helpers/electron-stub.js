// Minimal stand-in for the `electron` module so main-process modules can be unit-tested under
// plain Node. Only what the modules touch at load time or in the tested paths is provided.
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = process.env.SOQO_TEST_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'soqo-test-'));
const dirs = {
  userData: path.join(root, 'userData'),
  appData: path.join(root, 'appData'),
  downloads: path.join(root, 'downloads'),
  pictures: path.join(root, 'pictures'),
  desktop: path.join(root, 'desktop'),
};
for (const d of Object.values(dirs)) fs.mkdirSync(d, { recursive: true });

const listeners = {};
const app = {
  getPath: (k) => dirs[k] || path.join(root, k),
  setPath: (k, v) => { dirs[k] = v; },
  getVersion: () => '0.0.0-test',
  getName: () => 'soqo-island-test',
  isPackaged: false,
  on: (ev, fn) => { (listeners[ev] ||= []).push(fn); },
  whenReady: () => Promise.resolve(),
  requestSingleInstanceLock: () => true,
};
let clipText = '';
const clipboard = {
  readText: async () => clipText,
  writeText: async (t) => { clipText = String(t); },
  _set: (t) => { clipText = t; },
};
const shell = { openExternal: async () => {}, openPath: async () => '', showItemInFolder: () => {} };
const nativeImage = { createEmpty: () => ({ isEmpty: () => true, toDataURL: () => '' }), createFromPath: () => ({ isEmpty: () => true }) };

// enough of the window APIs for modules that register handlers at load time
const ipcMain = { on() {}, handle() {} };
class BrowserWindow { static fromWebContents() { return null; } }
const screen = { getPrimaryDisplay: () => ({ workArea: { x: 0, y: 0, width: 1920, height: 1040 } }), getCursorScreenPoint: () => ({ x: 0, y: 0 }) };

module.exports = { app, clipboard, shell, nativeImage, ipcMain, BrowserWindow, screen, _root: root, _dirs: dirs };
