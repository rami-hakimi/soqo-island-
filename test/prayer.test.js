// Characterisation tests: the values below are what the imported Nova Island 1.4.0 algorithm
// produced for these inputs (plausibility checked against published timetables). They guard
// the prayer maths against regressions during the migration; they are not an independent
// astronomical reference.
const test = require('node:test');
const assert = require('node:assert/strict');
const prayer = require('../prayer');

const CAIRO = { lat: 30.0444, lon: 31.2357, country: 'EG' };
const MAKKAH = { lat: 21.4225, lon: 39.8262, country: 'SA' };
const LONDON = { lat: 51.5072, lon: -0.1276, country: 'GB' };

test('Cairo, Egyptian authority, spring', () => {
  const d = prayer.calcDay({ y: 2026, m: 3, d: 15 }, CAIRO, 'Africa/Cairo');
  assert.equal(d.method, 'Egyptian General Authority of Survey');
  assert.deepEqual(d.times, { imsak: '04:29', fajr: '04:39', sunrise: '06:05', dhuhr: '12:04', asr: '15:30', maghrib: '18:03', isha: '19:20' });
  assert.equal(d.hijri, '26 رمضان 1447');
  assert.equal(d.hijriMonth, 9);
  assert.equal(d.tz, 'Africa/Cairo');
});

test('Makkah, Umm al-Qura, summer solstice: Isha = Maghrib + 90 min', () => {
  const d = prayer.calcDay({ y: 2026, m: 6, d: 21 }, MAKKAH, 'Asia/Riyadh');
  assert.equal(d.method, 'Umm Al-Qura University, Makkah');
  assert.deepEqual(d.times, { imsak: '04:01', fajr: '04:11', sunrise: '05:39', dhuhr: '12:22', asr: '15:43', maghrib: '19:06', isha: '20:36' });
  assert.equal(d.hijriMonth, 1);
});

test('Makkah in Ramadan: Isha = Maghrib + 120 min', () => {
  const d = prayer.calcDay({ y: 2026, m: 3, d: 1 }, MAKKAH, 'Asia/Riyadh');
  assert.equal(d.hijriMonth, 9);
  assert.equal(d.times.maghrib, '18:25');
  assert.equal(d.times.isha, '20:25');
});

test('London, winter, falls back to Muslim World League', () => {
  const d = prayer.calcDay({ y: 2026, m: 12, d: 21 }, LONDON, 'Europe/London');
  assert.equal(d.method, 'Muslim World League');
  assert.deepEqual(d.times, { imsak: '05:49', fajr: '05:59', sunrise: '08:04', dhuhr: '11:59', asr: '13:39', maghrib: '15:53', isha: '17:51' });
});

test('method from time zone when the country is unknown', () => {
  const d = prayer.calcDay({ y: 2026, m: 3, d: 15 }, { lat: 30.0444, lon: 31.2357, timezone: 'Africa/Cairo' }, 'Africa/Cairo');
  assert.equal(d.method, 'Egyptian General Authority of Survey');
});
