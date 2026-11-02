const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldShow } = require('../src/shared/visibility');

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
