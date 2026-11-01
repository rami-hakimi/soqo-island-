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
const FILE = path.join(ROOT, 'src', 'renderer', 'island', 'views', 'reminders-data.js');
// sha256 of the file with LF line endings (what the repository stores; a Windows checkout with
// autocrlf may present CRLF, which is not a content change)
const EXPECTED_SHA256 = '0435d75c2891c32a28277acba979ebbf545779c2b102412b9ee899a5ec5eae09';

test('reminders data is byte-identical to the reviewed version', () => {
  const text = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(crypto.createHash('sha256').update(text, 'utf8').digest('hex'), EXPECTED_SHA256);
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
  const font = path.join(ROOT, 'assets', 'fonts', 'KFGQPC-Hafs-V30.ttf');
  const lic = path.join(ROOT, 'assets', 'fonts', 'KFGQPC-LICENSE.txt');
  assert.ok(fs.existsSync(font));
  assert.ok(fs.existsSync(lic));
  assert.match(fs.readFileSync(lic, 'utf8'), /King Fahd Glorious Quran Printing Complex/);
});
