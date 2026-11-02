const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/shared/placement');

const D = { bounds: { x: 0, y: 0, width: 1536, height: 864 }, workArea: { x: 0, y: 0, width: 1536, height: 816 } }; // 1920×1080 at 125 %
const H = { vertical: false, side: 'right', docked: false };

test('default anchor is the top centre of the display, 8 px down', () => {
  assert.deepEqual(P.defaultAnchor(D.bounds), { x: 768, y: 8 });
  assert.equal(P.atDefaultPlace({ x: 768, y: 8 }, D.bounds), true);
  assert.equal(P.atDefaultPlace({ x: 500, y: 8 }, D.bounds), false);
  assert.equal(P.atDefaultPlace({ x: 768, y: 300 }, D.bounds), false);
});

test('a docked island sits on the top edge with the window centred under the anchor', () => {
  const r = P.layout({ x: 768, y: 0 }, D, { ...H, docked: true });
  assert.deepEqual(r.anchor, { x: 768, y: 0 });
  assert.deepEqual(r.win, { x: 448, y: 0 });
});

test('a floating island keeps its own place; the window leaves headroom above it', () => {
  const r = P.layout({ x: 400, y: 300 }, D, H);
  assert.deepEqual(r.anchor, { x: 400, y: 300 });
  assert.deepEqual(r.win, { x: 80, y: 256 });
});

test('an anchor off the display is pulled back onto it (resolution or monitor change)', () => {
  const r = P.layout({ x: 3000, y: 2000 }, D, H);
  assert.equal(r.anchor.x, 1536 - 120);
  assert.equal(r.anchor.y, 816 - 34 - 6);
  assert.ok(r.win.x + 640 <= 1536 && r.win.y + 356 <= 864, 'window fully on screen');
  const l = P.layout({ x: -500, y: -50 }, D, H);
  assert.deepEqual(l.anchor, { x: 120, y: 0 });
  assert.deepEqual(l.win, { x: 0, y: 0 });
});

test('a second display to the left keeps its own coordinates', () => {
  const left = { bounds: { x: -1920, y: 0, width: 1920, height: 1080 }, workArea: { x: -1920, y: 0, width: 1920, height: 1032 } };
  const r = P.layout(P.defaultAnchor(left.bounds), left, { ...H, docked: true });
  assert.deepEqual(r.anchor, { x: -960, y: 0 });
  assert.deepEqual(r.win, { x: -1280, y: 0 });
});

test('vertical islands hug the chosen edge and stay inside the work area', () => {
  const r = P.layout({ x: 700, y: 10 }, D, { vertical: true, side: 'left', docked: false });
  assert.deepEqual(r.anchor, { x: 0, y: 124 });
  assert.deepEqual(r.win, { x: 0, y: 0 });
  const rr = P.layout({ x: 700, y: 900 }, D, { vertical: true, side: 'right', docked: false });
  assert.deepEqual(rr.anchor, { x: 1536, y: 816 - 124 });
  assert.equal(rr.win.x, 1536 - 640);
});

test('layout is stable: running it twice on its own result changes nothing', () => {
  const once = P.layout({ x: 768, y: 8 }, D, H);
  const twice = P.layout(once.anchor, D, H);
  assert.deepEqual(twice, once);
});

test('address-bar slot: right third of the omnibox, or null when that third is off screen', () => {
  const slot = P.addressBarSlot({ x: 200, y: 60, width: 900, height: 28 }, D.bounds);
  assert.ok(slot);
  assert.equal(slot.cx, 200 + 900 - 150);
  assert.equal(slot.sw, 288);
  assert.equal(slot.sh, 30);
  // a browser window hanging off the left edge: its omnibox's right third is on screen → slot
  assert.ok(P.addressBarSlot({ x: -200, y: 60, width: 1000, height: 28 }, D.bounds));
  // hanging off the right edge: the slot would be off screen → no slot, the island stays put
  assert.equal(P.addressBarSlot({ x: 1200, y: 60, width: 1000, height: 28 }, D.bounds), null);
  // above the display (window dragged up): no slot
  assert.equal(P.addressBarSlot({ x: 200, y: -40, width: 900, height: 28 }, D.bounds), null);
});
