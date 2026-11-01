const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const network = require('../network');

function withInterfaces(map, fn) {
  const orig = os.networkInterfaces;
  os.networkInterfaces = () => map;
  try { return fn(); } finally { os.networkInterfaces = orig; }
}
const v4 = (address, internal = false) => ({ family: 'IPv4', address, internal });

test('linkKind: wifi wins, APIPA and loopback do not count', () => {
  assert.equal(withInterfaces({ 'Wi-Fi': [v4('192.168.1.5')], Ethernet: [v4('10.0.0.2')] }, network.linkKind), 'wifi');
  assert.equal(withInterfaces({ Ethernet: [v4('10.0.0.2')] }, network.linkKind), 'ethernet');
  assert.equal(withInterfaces({ 'Wi-Fi': [v4('169.254.3.3')], 'Loopback Pseudo-Interface 1': [v4('127.0.0.1', true)] }, network.linkKind), 'none');
  assert.equal(withInterfaces({ WLAN: [v4('172.16.0.9')] }, network.linkKind), 'wifi');
});
