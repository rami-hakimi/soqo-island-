const test = require('node:test');
const assert = require('node:assert/strict');
const Front = require('../src/shared/front');

test('desktop, taskbar, Start menu and the app\'s own windows count as the desktop', () => {
  assert.equal(Front.classify({ shell: true, proc: 'explorer' }), 'desktop');
  assert.equal(Front.classify({ shell: false, proc: '' }), 'desktop', 'no foreground window');
  assert.equal(Front.classify({ shell: false, proc: 'StartMenuExperienceHost' }), 'desktop');
  assert.equal(Front.classify({ shell: false, proc: 'SearchHost' }), 'desktop');
  assert.equal(Front.classify({ shell: false, proc: 'Soqo Island', own: 'soqo island' }), 'desktop', 'Settings / Focus Mode');
  assert.equal(Front.classify({ shell: false, proc: 'electron', own: 'electron' }), 'desktop', 'dev run');
});

test('browsers, Explorer windows, editors and chat apps are applications', () => {
  for (const proc of ['chrome', 'msedge', 'explorer', 'Code', 'Discord', 'firefox']) {
    assert.equal(Front.classify({ shell: false, proc }), 'app', proc);
  }
});

test('a change is taken over only once it has settled; a flicker through Alt+Tab is ignored', () => {
  const s = Front.settled('desktop', 220);
  assert.equal(s.value, 'desktop');
  assert.equal(s.feed('app', 1000), false, 'first report of the app: pending');
  assert.equal(s.pending, 'app');
  assert.equal(s.feed('app', 1100), false, 'still inside the settle time');
  assert.equal(s.feed('app', 1230), true, 'settled: committed');
  assert.equal(s.value, 'app');
  // a quick trip to the desktop and back (Alt+Tab overlay) changes nothing
  assert.equal(s.feed('desktop', 2000), false);
  assert.equal(s.feed('app', 2100), false);
  assert.equal(s.pending, null, 'back to the committed value: the pending change is dropped');
  assert.equal(s.feed('desktop', 3000), false);
  assert.equal(s.feed('desktop', 3250), true);
  assert.equal(s.value, 'desktop');
  assert.equal(s.feed('desktop', 3300), false, 'same value again: no change reported');
});
