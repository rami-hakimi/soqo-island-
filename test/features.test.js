const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const features = require('../features');

test('defaults are complete and unchanged by unknown keys', () => {
  const before = features.get();
  assert.equal(before.remindEvery, 5);
  assert.equal(before.tabMedia, true);
  const after = features.set({ notAKey: true, tabMedia: 'yes' });
  assert.deepEqual(after, before, 'wrong types and unknown keys are ignored');
});

test('numbers are rounded and clamped to their range', () => {
  features.set({ remindEvery: 999, waterGoal: 1, hijriAdjust: 1.6 });
  const f = features.get();
  assert.equal(f.remindEvery, 240);
  assert.equal(f.waterGoal, 4);
  assert.equal(f.hijriAdjust, 2);
  features.set({ remindEvery: NaN });
  assert.equal(features.get().remindEvery, 240, 'NaN is ignored');
});

test('set persists to features.json and notifies listeners; reset restores defaults', () => {
  let seen = null;
  features.onChange((f) => { seen = f; });
  features.set({ tabApps: false });
  assert.equal(seen.tabApps, false);
  const file = path.join(app.getPath('userData'), 'features.json');
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).tabApps, false);
  features.reset();
  assert.equal(features.get().tabApps, true);
  assert.equal(features.get().remindEvery, 5);
});
