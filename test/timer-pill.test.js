const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const T = require('../src/shared/timer-pill');

test('three sizes with the required widths; small is the original pill', () => {
  assert.deepEqual(T.SIZES, ['small', 'medium', 'large']);
  assert.deepEqual(T.dims('small'), [300, 32]);
  const [mw, mh] = T.dims('medium');
  assert.ok(mw >= 230 && mw <= 260, `medium width ${mw}`);
  assert.ok(mh > 32);
  const [lw, lh] = T.dims('large');
  assert.ok(lw >= 290 && lw <= 330, `large width ${lw}`);
  assert.ok(lh > mh);
  assert.ok(T.FONT_PX.large >= 40 && T.FONT_PX.large <= 48, 'large countdown 40–48 px');
  assert.ok(T.FONT_PX.medium > T.FONT_PX.small);
  assert.deepEqual(T.dims('nonsense'), [300, 32], 'unknown size falls back to small');
});

test('hover: medium and large grow for inline controls, small keeps the original behaviour', () => {
  assert.deepEqual(T.dims('small', { hover: true }), [300, 32]);
  assert.equal(T.dims('medium', { hover: true })[0], 250 + T.HOVER_EXTRA.medium);
  assert.equal(T.dims('large', { hover: true })[0], 310 + T.HOVER_EXTRA.large);
  assert.equal(T.dims('large', { hover: true })[1], 60, 'height never changes on hover');
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
  features.set({ timerSize: 'huge' });
  assert.equal(features.get().timerSize, 'small', 'unknown size ignored');
  features.set({ timerSize: 'large', timerOnTop: true });
  const saved = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'features.json'), 'utf8'));
  assert.equal(saved.timerSize, 'large');
  assert.equal(saved.timerOnTop, true);
  features.set({ timerSize: 'small', timerOnTop: false });
});
