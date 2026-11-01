const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const log = require('../src/main/log');

test('init writes a start line, rotates past 1 MB, report has versions and tail', () => {
  log.init();
  const file = log.logPath();
  assert.ok(fs.existsSync(file));
  assert.match(fs.readFileSync(file, 'utf8'), /INFO start 0\.0\.0-test/);
  fs.writeFileSync(file, 'x'.repeat(1024 * 1024 + 1));
  log.info('after rotation');
  assert.ok(fs.existsSync(`${file}.old`), 'old log kept');
  assert.match(fs.readFileSync(file, 'utf8'), /after rotation/);
  const r = log.report({ bridge: { state: 'ok' } });
  assert.match(r, /0\.0\.0-test \(dev\)/);
  assert.match(r, /bridge: \{"state":"ok"\}/);
  assert.match(r, /after rotation/);
});
