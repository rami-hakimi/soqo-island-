const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const migrate = require('../src/main/migrate');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'soqo-migrate-'));
}

test('userData: copies JSON stores and Local Storage once, leaves the source untouched', () => {
  const root = tmp();
  const oldDir = path.join(root, 'dynamic-nova');
  const newDir = path.join(root, 'soqo-island');
  fs.mkdirSync(path.join(oldDir, 'Local Storage', 'leveldb'), { recursive: true });
  fs.mkdirSync(path.join(oldDir, 'Cache'), { recursive: true });
  fs.writeFileSync(path.join(oldDir, 'settings.json'), '{"ax":10,"ay":8}');
  fs.writeFileSync(path.join(oldDir, 'features.json'), '{"novaEyes":false}');
  fs.writeFileSync(path.join(oldDir, 'nova.log'), 'log');
  fs.writeFileSync(path.join(oldDir, 'Local Storage', 'leveldb', '000001.log'), 'ls');
  fs.writeFileSync(path.join(oldDir, 'Cache', 'blob'), 'x');

  assert.equal(migrate.userData(oldDir, newDir), oldDir);
  assert.equal(fs.readFileSync(path.join(newDir, 'settings.json'), 'utf8'), '{"ax":10,"ay":8}');
  assert.equal(fs.readFileSync(path.join(newDir, 'features.json'), 'utf8'), '{"novaEyes":false}');
  assert.ok(fs.existsSync(path.join(newDir, 'Local Storage', 'leveldb', '000001.log')));
  assert.ok(!fs.existsSync(path.join(newDir, 'nova.log')), 'logs are not copied');
  assert.ok(!fs.existsSync(path.join(newDir, 'Cache')), 'caches are not copied');
  const marker = JSON.parse(fs.readFileSync(path.join(newDir, migrate.MARKER), 'utf8'));
  assert.equal(marker.from, oldDir);
  assert.equal(marker.copied, 3);
  // source intact
  assert.deepEqual(fs.readdirSync(oldDir).sort(), ['Cache', 'Local Storage', 'features.json', 'nova.log', 'settings.json']);

  // second run: nothing happens even if the old settings changed
  fs.writeFileSync(path.join(oldDir, 'settings.json'), '{"ax":99}');
  assert.equal(migrate.userData(oldDir, newDir), '');
  assert.equal(fs.readFileSync(path.join(newDir, 'settings.json'), 'utf8'), '{"ax":10,"ay":8}');
});

test('userData: never overwrites settings the new app already has', () => {
  const root = tmp();
  const oldDir = path.join(root, 'old');
  const newDir = path.join(root, 'new');
  fs.mkdirSync(oldDir);
  fs.mkdirSync(newDir);
  fs.writeFileSync(path.join(oldDir, 'settings.json'), '{"old":true}');
  fs.writeFileSync(path.join(newDir, 'settings.json'), '{"mine":true}');
  assert.equal(migrate.userData(oldDir, newDir), '');
  assert.equal(fs.readFileSync(path.join(newDir, 'settings.json'), 'utf8'), '{"mine":true}');
  assert.equal(JSON.parse(fs.readFileSync(path.join(newDir, migrate.MARKER), 'utf8')).skipped, true);
});

test('userData: no old folder means no-op and no marker', () => {
  const root = tmp();
  const newDir = path.join(root, 'new');
  assert.equal(migrate.userData(path.join(root, 'missing'), newDir), '');
  assert.ok(!fs.existsSync(path.join(newDir, migrate.MARKER)));
});

test('featureKeys: old companion keys map to the new ones, new values win, others untouched', () => {
  assert.deepEqual(migrate.featureKeys({ novaEyes: false, novaFocus: true, tabMedia: true }), { soqiEyes: false, soqiFocus: true, tabMedia: true });
  assert.deepEqual(migrate.featureKeys({ novaEyes: false, soqiEyes: true }), { soqiEyes: true });
  assert.deepEqual(migrate.featureKeys({}), {});
  assert.deepEqual(migrate.featureKeys(null), {});
});
