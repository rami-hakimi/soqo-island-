const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const dl = require('../src/main/browser-downloads');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const downloads = app.getPath('downloads');

test('a growing partial file becomes a download, its disappearance a completed item', { timeout: 15000 }, async () => {
  let changes = 0;
  dl.start(() => changes++, true);
  const partial = path.join(downloads, 'movie.mp4.crdownload');
  fs.writeFileSync(partial, Buffer.alloc(1000));
  await sleep(400);
  fs.appendFileSync(partial, Buffer.alloc(4000));
  await sleep(1800); // SHOW_AFTER_MS is 1.5 s
  let items = dl.items();
  assert.equal(items.length, 1);
  assert.equal(items[0].name, 'movie.mp4');
  assert.equal(items[0].status, 'downloading');
  assert.equal(items[0].source, 'folder');
  assert.ok(items[0].downloaded >= 5000);

  fs.renameSync(partial, path.join(downloads, 'movie.mp4'));
  await sleep(1500);
  items = dl.items();
  assert.equal(items.length, 1);
  assert.equal(items[0].status, 'completed');
  assert.equal(items[0].path, path.join(downloads, 'movie.mp4'));
  assert.ok(changes > 0);
});

test('folder list: Windows Downloads is fixed; added folders must exist', () => {
  const list = dl.folderList();
  assert.equal(list[0].fixed, true);
  assert.equal(path.resolve(list[0].path).toLowerCase(), path.resolve(downloads).toLowerCase());
  assert.equal(dl.addFolder('C:\\definitely\\missing\\folder').length, list.length);
  assert.equal(dl.addFolder('relative').length, list.length);
  const extra = fs.mkdtempSync(path.join(downloads, 'extra-'));
  assert.equal(dl.addFolder(extra).length, list.length + 1);
  assert.equal(dl.removeFolder(extra).length, list.length);
});
