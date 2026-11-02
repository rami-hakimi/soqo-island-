// Open-Meteo's licence (CC BY 4.0, https://open-meteo.com/en/licence): "You must include a link
// next to any location Open-Meteo data are displayed". The island keeps a small visible link in
// the weather card plus an information control with the full credit; this test pins both and
// the popover's accessibility and dismissal wiring, so a redesign cannot drop them unnoticed.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'src/renderer/island/index.html'), 'utf8');
const sys = fs.readFileSync(path.join(ROOT, 'src/renderer/island/views/system.js'), 'utf8');
const main = fs.readFileSync(path.join(ROOT, 'src/main/main.js'), 'utf8');
const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/en.json'), 'utf8'));
const prefs = fs.readFileSync(path.join(ROOT, 'src/renderer/prefs/index.html'), 'utf8');
const notice = fs.readFileSync(path.join(ROOT, 'NOTICE.md'), 'utf8');

const card = html.slice(html.indexOf('id="wx-card"'), html.indexOf('id="wx-pop"'));

test('a visible Open-Meteo link sits inside the weather card', () => {
  assert.match(card, /id="wx-src"[^>]*data-i18n="weather.source"/);
  assert.match(en['weather.source'], /Open-Meteo/);
  assert.match(en['weather.credit'], /^Weather data by Open-Meteo\.com$/);
  assert.match(sys, /#wx-src'\)\.addEventListener\('click'[\s\S]*openSupport\('openmeteo'\)/);
  assert.match(main, /openmeteo: 'https:\/\/open-meteo\.com\/'/);
});

test('the information control reveals provider, licence and city-search credit', () => {
  assert.match(card, /id="wx-info"[^>]*aria-haspopup="dialog"/);
  assert.match(card, /id="wx-info"[^>]*aria-expanded="false"/);
  assert.match(card, /id="wx-info"[^>]*aria-controls="wx-pop"/);
  assert.match(card, /id="wx-info"[^>]*data-i18n-aria="weather.about"/);
  const pop = html.slice(html.indexOf('id="wx-pop"'), html.indexOf('</section>', html.indexOf('id="wx-pop"')));
  assert.match(pop, /role="dialog"/);
  assert.match(pop, /data-support="openmeteo"/);
  assert.match(pop, /data-support="ccby"/);
  assert.match(pop, /data-support="openmeteoLicence"/);
  assert.match(pop, /data-support="geonames"/);
  assert.match(en['weather.popText'], /Open-Meteo\.com/);
  assert.match(en['weather.popText'], /Attribution 4\.0/);
  assert.match(en['weather.popText'], /GeoNames/);
  assert.match(main, /ccby: 'https:\/\/creativecommons\.org\/licenses\/by\/4\.0\/'/);
  assert.match(main, /openmeteoLicence: 'https:\/\/open-meteo\.com\/en\/licence'/);
  assert.match(main, /geonames: 'https:\/\/www\.geonames\.org\/'/);
});

test('the popover closes on Escape, on a click elsewhere, on blur and when the island collapses', () => {
  assert.match(sys, /e\.key === 'Escape'/);
  assert.match(sys, /document\.addEventListener\('pointerdown'/);
  assert.match(sys, /window\.addEventListener\('blur'/);
  assert.match(sys, /island:mode[\s\S]*mode !== 'expanded'[\s\S]*openPop\(false\)/);
  assert.match(sys, /aria-expanded/);
  // the popover is part of the island's own layout, never a separate window over other apps
  assert.equal(html.includes('id="wx-pop"') && html.indexOf('id="wx-pop"') > html.indexOf('<section id="v-system"'), true);
  assert.ok(html.indexOf('id="wx-pop"') < html.indexOf('<section id="v-activity"'));
});

test('credits stay in Settings and in the legal files', () => {
  assert.match(prefs, /data-i18n="weather.credit"/);
  assert.match(prefs, /data-support="openmeteo"/);
  assert.match(notice, /Open-Meteo/);
  assert.match(notice, /CC BY 4\.0/);
});
