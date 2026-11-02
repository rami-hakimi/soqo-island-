// Windows notification mirroring in main: opt-in, Windows' answer, previews, duplicates, items
// Windows dropped, do-not-disturb, and "Open app" never doing more than focusing a window.
const test = require('node:test');
const assert = require('node:assert/strict');
const notifications = require('../src/main/notifications');

const sent = [];
const cmds = [];
const fresh = [];
notifications.onFresh((it) => fresh.push(it));
notifications.start((ch, data) => sent.push([ch, data]), { helperWrite: (c) => cmds.push(c), enabled: false, preview: true });
const last = () => sent.filter(([ch]) => ch === 'notif').pop()?.[1];
const toast = (id, over = {}) => ({ id, app: 'Google Chrome', aumid: 'Chrome', title: 'Someone', body: 'hello there', at: 1700000000000 + id, ...over });

test('off by default: the helper is not asked and helper lines are ignored', () => {
  assert.deepEqual(cmds, []);
  notifications.onHelper({ notif: [toast(1)], notifAccess: 'allowed' });
  assert.equal(fresh.length, 0);
  assert.equal(notifications.snapshot().items.length, 0);
  assert.equal(notifications.snapshot().access, 'off');
});

test('turning it on asks Windows through the helper; the answer is reported, denied means nothing is read', () => {
  notifications.configure({ enabled: true, preview: true });
  assert.deepEqual(cmds, ['notif on']);
  assert.equal(notifications.snapshot().access, 'waiting');
  notifications.onHelper({ notifAccess: 'denied' });
  assert.equal(last().access, 'denied');
  notifications.onHelper({ notifAccess: 'allowed' });
  assert.equal(notifications.snapshot().access, 'allowed');
});

test('new toasts arrive once, duplicates and repeats within a moment are dropped, the list is bounded', () => {
  sent.length = 0;
  notifications.onHelper({ notif: [toast(10), toast(10), toast(11, { title: 'Someone', body: 'hello there', at: 1700000000000 + 10 + 2000 })] });
  assert.equal(fresh.length, 1, 'same app, title and body two seconds later is the same message');
  assert.equal(notifications.snapshot().items.length, 1);
  notifications.onHelper({ notif: [toast(10)] });
  assert.equal(fresh.length, 1, 'an id seen before is not fresh again');
  for (let i = 100; i < 160; i++) notifications.onHelper({ notif: [toast(i, { title: `t${i}` })] });
  assert.ok(notifications.snapshot().items.length <= 30);
  assert.equal(notifications.snapshot().items[0].id, 159, 'newest first');
  // hostile shapes
  notifications.onHelper({ notif: [null, 'x', { id: 'nope' }, { id: 1.5 }, { id: 200, app: { a: 1 }, title: 'ok\u0000\u0007', body: 'b'.repeat(5000), at: 'soon' }] });
  const it = notifications.snapshot().items[0];
  assert.equal(it.id, 200);
  assert.equal(it.app, '');
  assert.equal(it.title, 'ok');
  assert.ok(it.body.length <= 240);
  assert.ok(Number.isFinite(it.at));
});

test('previews off: app and title only; Windows dropped a toast: so do we', () => {
  cmds.length = 0;
  notifications.configure({ enabled: true, preview: false });
  assert.deepEqual(cmds, ['notif on nopreview']);
  notifications.onHelper({ notifAccess: 'allowed' });
  notifications.onHelper({ notif: [toast(300, { body: 'private text' })] });
  assert.equal(notifications.snapshot().items[0].body, '');
  const before = notifications.snapshot().items.length;
  notifications.onHelper({ notifGone: [300, 'x', 999999] });
  assert.equal(notifications.snapshot().items.length, before - 1);
  assert.equal(notifications.snapshot().items.some((i) => i.id === 300), false);
});

test('do not disturb: items are listed but not announced', () => {
  fresh.length = 0;
  notifications.onHelper({ quiet: true });
  notifications.onHelper({ notif: [toast(400, { title: 'quiet one' })] });
  assert.equal(fresh.length, 0);
  assert.equal(notifications.snapshot().items[0].title, 'quiet one');
  assert.equal(notifications.snapshot().quiet, true);
  notifications.onHelper({ quiet: false });
  notifications.onHelper({ notif: [toast(401, { title: 'loud one' })] });
  assert.equal(fresh.length, 1);
});

test('open: only a window of a known app is focused; links and commands never run', () => {
  cmds.length = 0;
  notifications.onHelper({ notif: [toast(500, { aumid: 'Chrome' }), toast(501, { aumid: 'Some.Unknown.App', app: 'Mystery' }), toast(502, { aumid: 'evil', app: 'cmd.exe /c calc' })] });
  assert.equal(notifications.open(500), true);
  assert.deepEqual(cmds, ['focusproc chrome']);
  assert.equal(notifications.open(501), false);
  assert.equal(notifications.open(502), false);
  assert.equal(notifications.open(9999), false);
  assert.equal(cmds.length, 1);
  notifications.dismiss(500);
  assert.equal(notifications.snapshot().items.some((i) => i.id === 500), false);
});

test('turning it off forgets everything and tells the helper; a restarted helper is asked again', () => {
  cmds.length = 0;
  notifications.configure({ enabled: false, preview: false });
  assert.deepEqual(cmds, ['notif off']);
  assert.equal(notifications.snapshot().items.length, 0);
  assert.equal(notifications.snapshot().access, 'off');
  notifications.helperRestarted();
  assert.equal(cmds.length, 1, 'off: nothing to repeat');
  notifications.configure({ enabled: true, preview: true });
  cmds.length = 0;
  notifications.helperRestarted();
  assert.deepEqual(cmds, ['notif on']);
  notifications.configure({ enabled: false, preview: true });
});
