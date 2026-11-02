const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const T = require('../src/shared/timer-pill');

test('three sizes with the required widths; small is the compact pill', () => {
  assert.deepEqual(T.SIZES, ['small', 'medium', 'large']);
  assert.deepEqual(T.dims('small'), [300, 38]);
  assert.ok(T.FONT_PX.small >= 16, 'small digits readable (beta.3: 17 px, was 13.5)');
  const [mw, mh] = T.dims('medium');
  assert.ok(mw >= 230 && mw <= 260, `medium width ${mw}`);
  assert.ok(mh > 32);
  const [lw, lh] = T.dims('large');
  // beta.4: Large is genuinely large (was 324 × 66 with 48 px digits), still inside the 640 px window
  assert.ok(lw >= 380 && lw + T.HOVER_EXTRA.large <= 640 - 8, `large width ${lw} (+${T.HOVER_EXTRA.large} on hover)`);
  assert.ok(lh >= mh * 1.6, `large height ${lh} clearly above medium ${mh}`);
  assert.ok(T.FONT_PX.large >= 56 && T.FONT_PX.large <= 72, 'large countdown 56–72 px');
  assert.ok(T.FONT_PX.large >= T.FONT_PX.medium * 2, 'large digits at least twice the medium digits');
  assert.ok(T.FONT_PX.medium > T.FONT_PX.small);
  assert.deepEqual(T.dims('nonsense'), [300, 38], 'unknown size falls back to small');
});

test('over an application a running timer shrinks to the mini pill; the Settings size is the desktop size', () => {
  const [w, h] = T.dims(T.MINI);
  assert.ok(w <= 180 && h <= 30, `mini pill ${w} × ${h} stays clear of browser tabs`);
  assert.ok(h < T.dims('small')[1], 'smaller than Small');
  assert.ok(T.FONT_PX.mini >= 14, 'still readable');
  for (const size of T.SIZES) {
    assert.equal(T.displaySize(size, { frontApp: true }), 'mini', `${size} over an app`);
    assert.equal(T.displaySize(size, { frontApp: false }), size, `${size} on the desktop`);
  }
  assert.equal(T.displaySize('mini', {}), 'small', 'mini is never a saved setting');
  assert.deepEqual(T.dims(T.MINI, { hover: true }), [w, h], 'no inline controls on the mini pill');
  assert.equal(T.inlineControls(T.MINI, true), false);
  assert.ok(!T.SIZES.includes(T.MINI), 'Settings offers the three desktop sizes only');
});

test('hover: medium and large grow for inline controls, small keeps the original behaviour', () => {
  assert.deepEqual(T.dims('small', { hover: true }), [300, 38]);
  assert.equal(T.dims('medium', { hover: true })[0], 260 + T.HOVER_EXTRA.medium);
  assert.equal(T.dims('large', { hover: true })[0], T.DIMS.large[0] + T.HOVER_EXTRA.large);
  assert.equal(T.dims('large', { hover: true })[1], T.DIMS.large[1], 'height never changes on hover');
  assert.equal(T.inlineControls('small', true), false);
  assert.equal(T.inlineControls('medium', true), true);
  assert.equal(T.inlineControls('large', true), true);
  assert.equal(T.inlineControls('large', false), false, 'no timer, no inline controls');
  assert.equal(T.dims('large', { vertical: true }), null, 'vertical islands keep their own pill');
});

test('placement: centred on the anchor, kept inside the window, docked at the top edge', () => {
  const vp = { width: 640, height: 356 };
  assert.deepEqual(T.place({ x: 320, y: 44 }, [310, 60], vp), { x: 165, y: 44 });
  // near the right edge the pill moves inward instead of leaving the window
  assert.deepEqual(T.place({ x: 600, y: 44 }, [310, 60], vp), { x: 640 - 310 - 4, y: 44 });
  assert.deepEqual(T.place({ x: 20, y: 44 }, [250, 44], vp), { x: 4, y: 44 });
  // docked islands sit at y = 0; low anchors are lifted so the pill fits
  assert.deepEqual(T.place({ x: 320, y: 44, docked: true }, [250, 44], vp), { x: 195, y: 0 });
  assert.deepEqual(T.place({ x: 320, y: 340 }, [250, 44], vp), { x: 195, y: 356 - 44 - 6 });
  // vertical: flush to the chosen edge
  assert.deepEqual(T.place({ x: 0, y: 100, vertical: true, side: 'left' }, [44, 136], vp), { x: 0, y: 32 });
  assert.deepEqual(T.place({ x: 0, y: 100, vertical: true, side: 'right' }, [44, 136], vp), { x: 596, y: 32 });
});

test('preferences: timerSize enum and timerOnTop persist through the features store', () => {
  const { app } = require('electron');
  delete require.cache[require.resolve('../src/main/features')];
  const features = require('../src/main/features');
  assert.equal(features.get().timerSize, 'small', 'existing users keep the compact pill');
  assert.equal(features.get().timerOnTop, false);
  assert.equal(features.get().addrIsland, false, 'beta.3: the browser address-bar slot is opt-in');
  assert.equal(features.get().hideMaximized, false, 'a maximized app never hides the island unless asked');
  features.set({ timerSize: 'huge' });
  assert.equal(features.get().timerSize, 'small', 'unknown size ignored');
  features.set({ timerSize: 'large', timerOnTop: true });
  const saved = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'features.json'), 'utf8'));
  assert.equal(saved.timerSize, 'large');
  assert.equal(saved.timerOnTop, true);
  features.set({ timerSize: 'small', timerOnTop: false });
});
