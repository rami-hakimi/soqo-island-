const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldShow, hiddenBy, controller } = require('../src/shared/visibility');

test('shown on the desktop and over normal windows', () => {
  assert.equal(shouldShow({}), true);
  assert.equal(shouldShow({ maximized: true }), true, 'a maximized app alone never hides the island');
});

test('the user can always hide it', () => {
  assert.equal(shouldShow({ userHidden: true }), false);
  assert.equal(shouldShow({ userHidden: true, timerRunning: true, timerOnTop: true }), false);
});

test('full-screen apps hide it by default; a running timer stays only by opt-in', () => {
  assert.equal(shouldShow({ fullscreen: true }), false);
  assert.equal(shouldShow({ fullscreen: true, hideFullscreen: false }), true);
  assert.equal(shouldShow({ fullscreen: true, timerRunning: true }), false);
  assert.equal(shouldShow({ fullscreen: true, timerRunning: true, timerOnTop: true }), true);
  assert.equal(shouldShow({ fullscreen: true, timerRunning: false, timerOnTop: true }), false);
});

test('maximized apps hide it only when the user enables that; the timer opt-in applies too', () => {
  assert.equal(shouldShow({ maximized: true, hideMaximized: true }), false);
  assert.equal(shouldShow({ maximized: true, hideMaximized: true, timerRunning: true, timerOnTop: true }), true);
  assert.equal(shouldShow({ maximized: false, hideMaximized: true }), true);
});

test('Focus Mode in front hides the island, even with the timer opt-in; never for good', () => {
  assert.equal(shouldShow({ focusMode: true, timerRunning: true, timerOnTop: true }), false);
  assert.equal(shouldShow({ focusMode: false, timerRunning: true }), true);
  assert.equal(hiddenBy({ focusMode: true }), 'focus');
  assert.equal(hiddenBy({ userHidden: true, focusMode: true }), 'user');
  assert.equal(hiddenBy({ fullscreen: true }), 'fullscreen');
  assert.equal(hiddenBy({ maximized: true, hideMaximized: true }), 'maximized');
  assert.equal(hiddenBy({}), null);
});

// --- the state holder main uses (regression tests for the hidden-island report) ---
function harness() {
  const calls = [];
  const c = controller((show) => calls.push(show));
  return { c, calls, last: () => calls[calls.length - 1] };
}

test('hide then restore: the menu entry names the action available now', () => {
  const { c, last } = harness();
  assert.equal(c.menuKey(), 'menu.hide', 'shown island: the menu offers Hide');
  assert.equal(c.toggle(), false, 'Hide island hides it');
  assert.equal(last(), false);
  assert.equal(c.menuKey(), 'menu.show', 'hidden island: the menu offers Show');
  assert.equal(c.reason(), 'user');
  assert.equal(c.toggle(), true, 'Show island brings it back');
  assert.equal(last(), true);
});

test('tray Show island works whatever hid it from the user side', () => {
  const { c } = harness();
  c.hide();
  assert.equal(c.shown, false);
  assert.equal(c.show(), true, 'the tray entry calls show()');
  // hidden by the user while a timer runs over a full-screen app: Show island still restores
  c.update({ fullscreen: true, timerRunning: true, timerOnTop: true });
  c.hide();
  assert.equal(c.shown, false);
  assert.equal(c.show(), true);
});

test('second launch reveals a hidden island; a policy-hidden island reports why', () => {
  const { c } = harness();
  c.hide();
  assert.equal(c.reveal(), true, 'launching the app again brings the island back');
  assert.equal(c.hidden, false);
  // hidden by the full-screen rule: the second launch cannot show it over the game, but says so
  c.update({ fullscreen: true });
  assert.equal(c.reveal(), false);
  assert.equal(c.reason(), 'fullscreen');
  c.update({ fullscreen: false });
  assert.equal(c.shown, true, 'back as soon as the full-screen app is gone');
});

test('quit and restart: a fresh controller always starts shown (the choice is not persisted)', () => {
  const { c } = harness();
  c.hide();
  assert.equal(c.shown, false);
  const fresh = controller(() => {});
  assert.equal(fresh.shown, true);
  assert.equal(fresh.hidden, false);
  assert.equal(fresh.menuKey(), 'menu.hide');
});

test('Focus Mode or a maximized-window rule never hides the island permanently', () => {
  const { c } = harness();
  assert.equal(c.update({ focusMode: true }), false);
  assert.equal(c.reason(), 'focus');
  assert.equal(c.update({ focusMode: false }), true, 'Focus Mode closed: island back');
  assert.equal(c.update({ maximized: true, hideMaximized: true }), false);
  assert.equal(c.update({ maximized: false }), true, 'app restored: island back');
  assert.equal(c.update({ maximized: true, hideMaximized: false }), true, 'rule switched off: island back at once');
});
