const test = require('node:test');
const assert = require('node:assert/strict');
const { createMachine, STATES } = require('../shared/soqi-state');

function clock(start = 1000) {
  let t = start;
  const now = () => t;
  now.tick = (ms) => { t += ms; };
  return now;
}

test('resting state follows context: away > cursor near > music > listening > idle', () => {
  const m = createMachine(clock());
  assert.equal(m.current(), 'idle');
  m.set('hasMedia', true);
  assert.equal(m.current(), 'listening');
  m.set('playing', true);
  assert.equal(m.current(), 'music');
  m.set('near', true);
  assert.equal(m.current(), 'curious');
  m.set('away', true);
  assert.equal(m.current(), 'sleeping');
  m.set('away', false);
  m.set('near', false);
  m.set('typing', true);
  assert.equal(m.current(), 'curious');
});

test('reactions expire and respect priority', () => {
  const now = clock();
  const m = createMachine(now);
  assert.equal(m.react('download'), true);
  assert.equal(m.current(), 'download');
  // a weaker reaction does not interrupt a stronger one
  assert.equal(m.react('happy'), false);
  assert.equal(m.current(), 'download');
  // a stronger one does
  assert.equal(m.react('warning', 1000), true);
  assert.equal(m.current(), 'warning');
  now.tick(999);
  assert.equal(m.current(), 'warning');
  now.tick(2);
  assert.equal(m.current(), 'idle');
  assert.equal(m.reacting(), false);
});

test('equal priority replaces (newest news wins), unknown states are ignored', () => {
  const m = createMachine(clock());
  m.react('notification');
  assert.equal(m.react('download'), true);
  assert.equal(m.current(), 'download');
  assert.equal(m.react('robot'), false);
  assert.equal(m.react(''), false);
  m.clear();
  assert.equal(m.current(), 'idle');
});

test('every state has artwork and a default duration', () => {
  const fs = require('fs');
  const path = require('path');
  const { DEFAULT_MS, PRIORITY } = require('../shared/soqi-state');
  for (const s of STATES) {
    assert.ok(DEFAULT_MS[s] > 0, s);
    assert.ok(s in PRIORITY, s);
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets', 'soqi', `${s}.png`)), `missing sprite ${s}.png`);
  }
});
