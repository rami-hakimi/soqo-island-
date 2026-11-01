const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const Islamic = require('../src/shared/islamic');
const migrate = require('../src/main/migrate');

test('isOn: the master switch gates every Islamic switch and nothing else', () => {
  const off = { islamic: false, tabPrayer: true, reminders: true, tabMedia: true };
  for (const k of Islamic.KEYS) assert.equal(Islamic.isOn(off, k), false, k);
  assert.equal(Islamic.isOn(off, 'tabMedia'), true);
  assert.equal(Islamic.isOn(off, 'islamic'), false);
  const on = { islamic: true, tabPrayer: false, reminders: true };
  assert.equal(Islamic.isOn(on, 'tabPrayer'), false, 'individual choice kept');
  assert.equal(Islamic.isOn(on, 'reminders'), true);
  assert.equal(Islamic.isOn({}, 'tabPrayer'), true, 'a missing master means on (old renderer default)');
});

test('fromNova: explicit off → off; tuned → on; untouched defaults → on but ask once', () => {
  assert.deepEqual(Islamic.fromNova({ tabPrayer: false, prayerAlerts: false, reminders: false }), { islamic: false, prompt: false });
  assert.deepEqual(Islamic.fromNova({ tabPrayer: true, reminders: false, remindEvery: 10 }), { islamic: true, prompt: false });
  assert.deepEqual(Islamic.fromNova({ tabMedia: false }), { islamic: true, prompt: true });
  assert.deepEqual(Islamic.fromNova({}), { islamic: true, prompt: true });
  assert.deepEqual(Islamic.fromNova(null), { islamic: true, prompt: true });
});

function freshFeatures() {
  delete require.cache[require.resolve('../src/main/features')];
  delete require.cache[require.resolve('../src/main/settings')];
  return require('../src/main/features');
}

test('fresh installation: Islamic features off, prayer method auto, adhan sound on behind the master', () => {
  const dir = app.getPath('userData');
  for (const f of ['features.json', migrate.MARKER]) { try { fs.unlinkSync(path.join(dir, f)); } catch {} }
  const features = freshFeatures();
  const f = features.get();
  assert.equal(f.islamic, false);
  assert.equal(f.islamicPrompt, false);
  assert.equal(f.prayerMethod, 'auto');
  assert.equal(f.adhanSound, true);
  assert.equal(Islamic.isOn(f, 'prayerAlerts'), false);
  assert.equal(Islamic.isOn(f, 'reminders'), false);
  assert.equal(features.set({ prayerMethod: 'NOPE' }).prayerMethod, 'auto', 'unknown method ignored');
  assert.equal(features.set({ prayerMethod: 'EGYPT' }).prayerMethod, 'EGYPT');
  features.set({ islamic: true });
  assert.equal(Islamic.isOn(features.get(), 'prayerAlerts'), true);
  features.reset();
  assert.equal(features.get().islamic, false);
});

test('existing Soqo Island users keep their own choice (no re-derivation without the import marker)', () => {
  const dir = app.getPath('userData');
  for (const f of ['features.json', migrate.MARKER]) { try { fs.unlinkSync(path.join(dir, f)); } catch {} }
  fs.writeFileSync(path.join(dir, 'features.json'), JSON.stringify({ islamic: true, prayerAlerts: false }));
  let f = freshFeatures().get();
  assert.equal(f.islamic, true);
  assert.equal(f.prayerAlerts, false);
  assert.equal(f.islamicPrompt, false);
  fs.writeFileSync(path.join(dir, 'features.json'), JSON.stringify({ islamic: false }));
  f = freshFeatures().get();
  assert.equal(f.islamic, false);
  // a Soqo profile from before the master switch existed (no key, no import marker): off
  fs.writeFileSync(path.join(dir, 'features.json'), JSON.stringify({ tabMedia: true, tabPrayer: true }));
  f = freshFeatures().get();
  assert.equal(f.islamic, false);
  assert.equal(f.islamicPrompt, false);
  try { fs.unlinkSync(path.join(dir, 'features.json')); } catch {}
});

test('profile imported from Nova Island: features stay on and the one-time question is armed', () => {
  const dir = app.getPath('userData');
  fs.writeFileSync(path.join(dir, migrate.MARKER), JSON.stringify({ from: 'x', copied: 2 }));
  fs.writeFileSync(path.join(dir, 'features.json'), JSON.stringify({ novaEyes: false, remindEvery: 10 }));
  let f = freshFeatures().get();
  assert.equal(f.islamic, true);
  assert.equal(f.islamicPrompt, true);
  assert.equal(f.soqiEyes, false, 'renamed key carried over');
  const saved = JSON.parse(fs.readFileSync(path.join(dir, 'features.json'), 'utf8'));
  assert.equal(saved.islamic, true, 'decision persisted so it is not re-derived');

  // an imported profile where the user had turned everything off stays off, no question
  fs.writeFileSync(path.join(dir, 'features.json'), JSON.stringify({ tabPrayer: false, prayerAlerts: false, reminders: false }));
  f = freshFeatures().get();
  assert.equal(f.islamic, false);
  assert.equal(f.islamicPrompt, false);
  for (const x of ['features.json', migrate.MARKER]) { try { fs.unlinkSync(path.join(dir, x)); } catch {} }
});
