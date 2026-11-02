const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const I18n = require('../src/shared/i18n');

const LOCALES = path.join(__dirname, '..', 'src', 'locales');
const en = JSON.parse(fs.readFileSync(path.join(LOCALES, 'en.json'), 'utf8'));
const ar = JSON.parse(fs.readFileSync(path.join(LOCALES, 'ar.json'), 'utf8'));
const nl = JSON.parse(fs.readFileSync(path.join(LOCALES, 'nl.json'), 'utf8'));
const base = (k) => k.replace(/_(zero|one|two|few|many|other)$/, '');

test('every English key has an Arabic translation and vice versa (plural forms compared by base key)', () => {
  const enKeys = new Set(Object.keys(en).map(base));
  const arKeys = new Set(Object.keys(ar).map(base));
  assert.deepEqual([...enKeys].filter((k) => !arKeys.has(k)), [], 'missing in ar');
  assert.deepEqual([...arKeys].filter((k) => !enKeys.has(k)), [], 'missing in en');
  for (const [k, v] of Object.entries({ ...en, ...ar })) assert.ok(typeof v === 'string' && v.length, k);
});

test('every English key has a Dutch translation and vice versa', () => {
  const enKeys = new Set(Object.keys(en).map(base));
  const nlKeys = new Set(Object.keys(nl).map(base));
  assert.deepEqual([...enKeys].filter((k) => !nlKeys.has(k)), [], 'missing in nl');
  assert.deepEqual([...nlKeys].filter((k) => !enKeys.has(k)), [], 'missing in en');
  for (const [k, v] of Object.entries(nl)) assert.ok(typeof v === 'string' && v.length, k);
  // Dutch has one/other like English: no stray Arabic-only plural categories
  assert.ok(!Object.keys(nl).some((k) => /_(zero|two|few|many)$/.test(k)));
});

test('Dutch: left-to-right, Netherlands locale, plurals and fallback', () => {
  const d = I18n.create({ lang: 'nl', dict: nl, fallback: en });
  assert.equal(d.dir, 'ltr');
  assert.equal(d.locale, 'nl-NL');
  assert.equal(d.t('shelf.count', { count: 1 }), '1 bestand');
  assert.equal(d.t('shelf.count', { count: 3 }), '3 bestanden');
  assert.equal(d.t('welcome.away', { dur: '5 min' }), '5 min weggeweest');
  assert.equal(d.t('p.support.developer'), 'Ontwikkeld door Rami al-Hakimi');
  // a date formatted with the Dutch locale reads day-month
  const s = new Date(Date.UTC(2026, 10, 2, 12, 0)).toLocaleDateString(d.locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  assert.match(s, /^ma 2 nov/);
  const partial = I18n.create({ lang: 'nl', dict: {}, fallback: en });
  assert.equal(partial.t('menu.quit'), 'Quit');
});

test('placeholders match between languages', () => {
  const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
  for (const k of Object.keys(en)) {
    // plural forms may drop the number ("one file" vs "{n} files"); compare the rest
    if (/_(zero|one|two|few|many|other)$/.test(k)) continue;
    if (k in ar) assert.equal(ph(ar[k]), ph(en[k]), `ar ${k}`);
    if (k in nl) assert.equal(ph(nl[k]), ph(en[k]), `nl ${k}`);
  }
});

test('t(): lookup, interpolation, fallback, plurals', () => {
  const i = I18n.create({ lang: 'ar', dict: ar, fallback: en });
  assert.equal(i.dir, 'rtl');
  assert.equal(i.locale, 'ar-u-nu-latn');
  assert.equal(i.t('apps.countHint', { n: 3, max: 12 }), '3/12 · انقر للفتح');
  assert.equal(i.t('no.such.key'), 'no.such.key');
  assert.equal(i.t('shelf.count', { count: 1 }), 'ملف واحد');
  assert.equal(i.t('shelf.count', { count: 2 }), 'ملفّان');
  assert.equal(i.t('shelf.count', { count: 5 }), '5 ملفات');
  assert.equal(i.t('shelf.count', { count: 11 }), '11 ملفًا');
  const e = I18n.create({ lang: 'en', dict: en, fallback: en });
  assert.equal(e.dir, 'ltr');
  assert.equal(e.locale, undefined);
  assert.equal(e.t('shelf.count', { count: 1 }), '1 file');
  assert.equal(e.t('shelf.count', { count: 0 }), '0 files');
  assert.equal(e.t('welcome.away', { dur: '5 min' }), 'Away for 5 min');
  // a key only in English falls back for Arabic
  const partial = I18n.create({ lang: 'ar', dict: {}, fallback: en });
  assert.equal(partial.t('menu.quit'), 'Quit');
});

test('religious source text is not in the dictionaries (it stays in its own data file)', () => {
  for (const v of [...Object.values(ar), ...Object.values(nl)]) assert.ok(!v.includes('﴿'), v);
});
