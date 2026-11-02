const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../src/shared/hover-policy');

test('pills wait for hover intent; cards and scenes take the mouse at once', () => {
  assert.equal(H.shouldActivate({ inside: true, active: false, suppressed: false, instant: false, sinceEnterMs: 100 }), false);
  assert.equal(H.shouldActivate({ inside: true, active: false, suppressed: false, instant: false, sinceEnterMs: 280 }), true);
  assert.equal(H.shouldActivate({ inside: true, active: false, suppressed: false, instant: true, sinceEnterMs: 0 }), true);
  assert.equal(H.shouldActivate({ inside: false, active: false, suppressed: false, instant: true, sinceEnterMs: 999 }), false, 'never outside the island');
  assert.equal(H.shouldActivate({ inside: true, active: true, suppressed: false, instant: true, sinceEnterMs: 999 }), false, 'already active');
  assert.equal(H.shouldActivate({ inside: true, active: false, suppressed: true, instant: true, sinceEnterMs: 999 }), false, 'released: stays click-through until the cursor leaves');
});

test('instant modes and padding', () => {
  assert.equal(H.instantFor('reminder'), true);
  assert.equal(H.instantFor('scene'), true);
  assert.equal(H.instantFor('toast', true), true);
  assert.equal(H.instantFor('toast', false), false);
  assert.equal(H.instantFor('idle'), false);
  assert.equal(H.instantFor('expanded'), false);
  assert.equal(H.pad({ active: false, instant: false }), 2);
  assert.equal(H.pad({ active: false, instant: true }), 10);
  assert.equal(H.pad({ active: true, instant: true }), 8);
  assert.equal(H.pollMs(true), 16);
  assert.equal(H.pollMs(false), 40);
});
