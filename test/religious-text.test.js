// The Qur'an verses, du'as and adhkar shipped with the app must never change for visual or
// branding reasons. This pins the exact bytes of the data file; a deliberate, reviewed
// content change updates the hash here in the same commit.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'views', 'reminders-data.js');
const EXPECTED_SHA256 = '357dd57992e43b480d5aa2bb19d6705551d30831893991701e3ba78a55178192';

test('reminders data is byte-identical to the reviewed version', () => {
  const buf = fs.readFileSync(FILE);
  assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), EXPECTED_SHA256);
});

test('every reminder has a kind, text and source reference', () => {
  const ctx = {};
  vm.runInNewContext(fs.readFileSync(FILE, 'utf8') + '; this.REMINDERS = REMINDERS;', ctx);
  assert.ok(ctx.REMINDERS.length >= 40);
  for (const r of ctx.REMINDERS) {
    assert.ok(['ayah', 'dua', 'dhikr'].includes(r.kind), r.text);
    assert.ok(r.text.trim().length > 0);
    assert.ok(r.ref.trim().length > 0, `missing reference for ${r.text}`);
  }
});

test('KFGQPC font and its licence ship together', () => {
  const font = path.join(ROOT, 'fonts', 'KFGQPC-Hafs-V30.ttf');
  const lic = path.join(ROOT, 'fonts', 'KFGQPC-LICENSE.txt');
  assert.ok(fs.existsSync(font));
  assert.ok(fs.existsSync(lic));
  assert.match(fs.readFileSync(lic, 'utf8'), /King Fahd Glorious Quran Printing Complex/);
});
