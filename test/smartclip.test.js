const test = require('node:test');
const assert = require('node:assert/strict');
const { classify, calc } = require('../smartclip');

test('calc: precedence, parentheses, powers, percent, unicode operators', () => {
  assert.equal(calc('2+3*4'), 14);
  assert.equal(calc('(2+3)*4'), 20);
  assert.equal(calc('2^3^2'), 512);
  assert.equal(calc('50%'), 0.5);
  assert.equal(calc('10 × 3 ÷ 4'), 7.5);
  assert.equal(calc('1,000 + 1'), 1001);
  assert.equal(calc('-(3)'), -3);
});

test('calc: rejects garbage and division to infinity', () => {
  assert.throws(() => calc('2+'));
  assert.throws(() => calc('(2'));
  assert.throws(() => calc('1/0'));
  assert.throws(() => calc('abc'));
});

test('classify: urls', () => {
  const r = classify('https://www.youtube.com/watch?v=abc');
  assert.equal(r.type, 'url');
  assert.equal(r.host, 'youtube.com');
  assert.equal(classify('ftp://x'), null);
  assert.equal(classify('https://a b'), null);
});

test('classify: colours', () => {
  assert.equal(classify('#ff0').type, 'color');
  assert.equal(classify('#A1B2C3D4').type, 'color');
  assert.equal(classify('rgb(1, 2, 3)').type, 'color');
  assert.equal(classify('hsl(120deg 50% 50% / 20%)').type, 'color');
  assert.equal(classify('#ggg'), null);
});

test('classify: math but not dates or phone numbers', () => {
  assert.deepEqual(classify('2*(3+4)'), { type: 'math', expr: '2*(3+4)', result: '14' });
  assert.equal(classify('12-10-2026'), null);
  assert.equal(classify('29/10/2026'), null);
  assert.equal(classify('010-1234-5678'), null);
  assert.equal(classify('42'), null);
});

test('classify: long text word count, short text nothing', () => {
  const words = Array.from({ length: 30 }, (_, i) => `w${i}`).join(' ');
  assert.deepEqual(classify(words), { type: 'text', words: 30, chars: words.length });
  assert.equal(classify('hello world'), null);
  assert.equal(classify('x'.repeat(4001)), null);
});
