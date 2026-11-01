const test = require('node:test');
const assert = require('node:assert/strict');
const { parse, appName } = require('../privacy');

const OUT = [
  'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone\\Microsoft.WindowsCamera_8wekyb3d8bbwe',
  '    LastUsedTimeStop    REG_QWORD    0x0',
  '',
  'HKEY_CURRENT_USER\\...\\microphone\\NonPackaged\\C:#Program Files#Google#Chrome#Application#chrome.exe',
  '    LastUsedTimeStop    REG_QWORD    0x1dc0a1b2c3d4e5',
  '',
  'HKEY_CURRENT_USER\\...\\microphone\\NonPackaged\\C:#Apps#zoom.exe',
  '    LastUsedTimeStop    REG_QWORD    0x0',
].join('\r\n');

test('parse lists only apps whose LastUsedTimeStop is 0', () => {
  assert.deepEqual(parse(OUT), ['Camera', 'Zoom']);
  assert.deepEqual(parse(''), []);
});

test('appName maps packaged and classic apps', () => {
  assert.equal(appName('HKCU\\...\\Microsoft.WindowsCamera_8wekyb3d8bbwe'), 'Camera');
  assert.equal(appName('HKCU\\...\\C:#Program Files#Google#Chrome#Application#chrome.exe'), 'Chrome');
  assert.equal(appName('HKCU\\...\\C:#x#someapp.exe'), 'Someapp');
});
