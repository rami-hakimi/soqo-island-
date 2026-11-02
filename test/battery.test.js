const test = require('node:test');
const assert = require('node:assert/strict');
const B = require('../src/shared/battery');

test('a desktop without a battery: nothing is shown, nothing is invented', () => {
  assert.equal(B.view({ present: false }).present, false);
  assert.equal(B.view(null).state, 'none');
  assert.equal(B.view(undefined).present, false);
  assert.equal(B.view('garbage').state, 'none');
  assert.equal(B.transition(null, B.view({ present: false })), null);
  assert.equal(B.transition(B.view({ present: false }), B.view({ present: false })), null);
});

test('states from what Windows reports', () => {
  assert.equal(B.view({ present: true, ac: false, charging: false, pct: 63 }).state, 'discharging');
  assert.equal(B.view({ present: true, ac: true, charging: true, pct: 63 }).state, 'charging');
  assert.equal(B.view({ present: true, ac: true, charging: false, pct: 100 }).state, 'full');
  assert.equal(B.view({ present: true, ac: true, charging: true, pct: 100 }).state, 'full');
  assert.equal(B.view({ present: true, ac: true, charging: false, pct: 80 }).state, 'plugged', 'charge limit: plugged in, not charging');
  assert.equal(B.view({ present: true, ac: null, charging: false, pct: 50 }).state, 'unknown');
  assert.equal(B.view({ present: true, ac: false, charging: false, pct: -1 }).state, 'unknown');
  assert.equal(B.view({ present: true, ac: false, charging: false, pct: 255 }).pct, -1, 'out of range is unknown');
  assert.equal(B.view({ present: true, ac: false, charging: false, pct: 20.5 }).pct, -1, 'only integers');
});

test('low and critical only while discharging; time left only when known', () => {
  const low = B.view({ present: true, ac: false, charging: false, pct: 20, minutes: 75 });
  assert.equal(low.low, true);
  assert.equal(low.critical, false);
  assert.deepEqual(B.hm(low.minutes), { h: 1, m: 15 });
  assert.equal(B.view({ present: true, ac: false, charging: false, pct: 10 }).critical, true);
  assert.equal(B.view({ present: true, ac: true, charging: true, pct: 5 }).low, false, 'charging at 5 % is not a warning');
  assert.equal(B.hm(-1), null);
  assert.equal(B.hm(undefined), null);
  assert.equal(B.view({ present: true, ac: false, charging: false, pct: 50, saver: true }).saver, true);
});

test('toasts: plugged in, unplugged, getting low, charged; never on the first reading', () => {
  const v = (ac, pct, charging = ac) => B.view({ present: true, ac, charging, pct });
  assert.equal(B.transition(null, v(false, 50)), null, 'first reading is not news');
  assert.deepEqual(B.transition(v(false, 50), v(true, 50)), { kind: 'charging' });
  assert.deepEqual(B.transition(v(true, 50), v(false, 50)), { kind: 'battery' });
  assert.deepEqual(B.transition(v(true, 15), v(false, 15)), { kind: 'low' }, 'unplugged while already low says low');
  assert.deepEqual(B.transition(v(false, 21), v(false, 20)), { kind: 'low' });
  assert.equal(B.transition(v(false, 19), v(false, 18)), null, 'no repeat while it drains');
  assert.deepEqual(B.transition(v(false, 11), v(false, 10)), { kind: 'low' }, 'critical is announced once more');
  assert.deepEqual(B.transition(v(true, 99), v(true, 100)), { kind: 'full' });
  assert.equal(B.transition(v(true, 100), v(true, 100)), null);
  assert.equal(B.transition(B.view({ present: true, ac: null, pct: 50 }), v(false, 50)), null, 'from unknown: nothing');
  assert.equal(B.transition(v(false, 50), B.view({ present: true, ac: false, pct: -1 })), null, 'to unknown: nothing');
  assert.equal(B.transition(v(true, 80, false), v(true, 80, true)), null, 'plugged → charging at the same level: quiet');
});
