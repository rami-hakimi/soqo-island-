const test = require('node:test');
const assert = require('node:assert/strict');
const mini = require('../src/main/mini');

test('mini player server: loopback only, secret path, three files, nothing else', async () => {
  await mini.startServer();
  const base = mini.baseUrl();
  assert.match(base, /^http:\/\/127\.0\.0\.1:\d+\/[0-9a-f]{32}$/);
  for (const f of ['index.html', 'mini.css', 'mini.js']) {
    const r = await fetch(`${base}/${f}`);
    assert.equal(r.status, 200, f);
    assert.equal(r.headers.get('cache-control'), 'no-store');
  }
  assert.equal((await fetch(`${base}/index.html`)).headers.get('content-type'), 'text/html; charset=utf-8');
  const origin = base.replace(/\/[0-9a-f]{32}$/, '');
  assert.equal((await fetch(`${origin}/index.html`)).status, 404, 'no token, no page');
  assert.equal((await fetch(`${base}/preload.js`)).status, 404);
  assert.equal((await fetch(`${base}/../package.json`)).status, 404);
  assert.equal((await fetch(`${base}/index.html`, { method: 'POST' })).status, 404);
  await mini.stopServer();
});
