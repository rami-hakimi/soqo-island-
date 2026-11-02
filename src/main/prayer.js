// Prayer times calculated on this PC, no network, with the calculation method each country
// follows (Egyptian General Authority of Survey in Egypt, Umm al-Qura in Saudi Arabia, ...).
// The Hijri date comes from the Umm al-Qura calendar built into Chromium. Recalculated just
// after midnight and when the location or the settings change.
//
// The calculation core below (julian, sunPosition, midDay, sunAngleTime, asrTime, the night
// portions) is a port of PrayTimes.js, Prayer Times Calculator v2.3,
// Copyright (C) 2007-2011 PrayTimes.org (Hamid Zarrabi-Zadeh), licensed under the GNU LGPL
// v3.0 (https://praytimes.org). The port keeps the formulas; the method table lives in
// prayer-methods.js. Combined with this GPL-3.0 program under LGPL-3.0 section 4; the LGPL
// text ships in THIRD_PARTY_NOTICES.md.
const settings = require('./settings');
const features = require('./features');

/** @type {(channel: string, data?: unknown) => void} */
let send = () => {};
let getLocation = null;
let data = settings.load('prayer-cache.json', null);
let midnightTimer = null;
let failed = false; // the last run found no location (logged once, until it works again)
let approx = false; // calculated for the time zone's capital, waiting for the real place

const { METHODS, methodFor } = require('./prayer-methods');

// ---- PrayTimes (degrees, hours) ----
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const sin = (d) => Math.sin(rad(d));
const cos = (d) => Math.cos(rad(d));
const tan = (d) => Math.tan(rad(d));
const asin = (x) => deg(Math.asin(x));
const acos = (x) => deg(Math.acos(x));
const atan2 = (y, x) => deg(Math.atan2(y, x));
const acot = (x) => deg(Math.atan(1 / x));
const fix = (a, b) => { const r = a - b * Math.floor(a / b); return r < 0 ? r + b : r; };
const fixAngle = (a) => fix(a, 360);
const fixHour = (h) => fix(h, 24);
const minutesOf = (v) => (typeof v === 'string' ? parseFloat(v) : 0);
const isMinutes = (v) => typeof v === 'string' && v.includes('min');

function julian(y, m, d) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

function sunPosition(jd) {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.915 * sin(g) + 0.020 * sin(2 * g));
  const e = 23.439 - 0.00000036 * D;
  const RA = atan2(cos(e) * sin(L), cos(L)) / 15;
  return { declination: asin(sin(e) * sin(L)), equation: q / 15 - fixHour(RA) };
}

// times in UTC hours for the civil day y-m-d at lat/lon
function computeDay(y, m, d, lat, lon, method, asrFactor) {
  const jDate = julian(y, m, d) - lon / (15 * 24);
  const midDay = (t) => fixHour(12 - sunPosition(jDate + t).equation);
  const sunAngleTime = (angle, t, ccw) => {
    const decl = sunPosition(jDate + t).declination;
    const noon = midDay(t);
    const h = acos((-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat))) / 15;
    return noon + (ccw ? -h : h);
  };
  const asrTime = (factor, t) => {
    const decl = sunPosition(jDate + t).declination;
    return sunAngleTime(-acot(factor + tan(Math.abs(lat - decl))), t);
  };
  // one refinement pass from rough guesses (day fractions), as PrayTimes does
  const g = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, sunset: 18, maghrib: 18, isha: 18 };
  for (const k in g) g[k] /= 24;
  const t = {
    fajr: sunAngleTime(method.fajr, g.fajr, true),
    sunrise: sunAngleTime(0.833, g.sunrise, true),
    dhuhr: midDay(g.dhuhr),
    asr: asrTime(asrFactor, g.asr),
    sunset: sunAngleTime(0.833, g.sunset),
    maghrib: isMinutes(method.maghrib) || !method.maghrib ? null : sunAngleTime(method.maghrib, g.maghrib),
    isha: isMinutes(method.isha) ? null : sunAngleTime(method.isha, g.isha),
  };
  for (const k in t) if (t[k] != null) t[k] -= lon / 15;
  // high latitudes: Fajr / Isha no later than a share of the night ("angle based")
  const night = fixHour(t.sunrise - t.sunset);
  const portion = (angle) => (angle / 60) * night;
  if (!isMinutes(method.fajr)) {
    const p = portion(method.fajr);
    if (Number.isNaN(t.fajr) || fixHour(t.sunrise - t.fajr) > p) t.fajr = t.sunrise - p;
  }
  t.maghrib = t.maghrib ?? t.sunset + minutesOf(method.maghrib) / 60;
  if (isMinutes(method.isha)) t.isha = t.maghrib + minutesOf(method.isha) / 60;
  else {
    const p = portion(method.isha);
    if (Number.isNaN(t.isha) || fixHour(t.isha - t.sunset) > p) t.isha = t.sunset + p;
  }
  return t;
}

// ---- days, zones and the Hijri date ----
const pad = (n) => String(n).padStart(2, '0');
// the calendar date (y, m, d) in `zone` for a moment
function dayIn(zone, moment) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: 'numeric', day: 'numeric' })
    .formatToParts(moment).map((x) => [x.type, Number(x.value)]));
  return { y: p.year, m: p.month, d: p.day };
}
// UTC hours on a day -> "HH:MM" in `zone`, rounded to the nearest minute
function clockIn(zone, day, hours) {
  const ms = Date.UTC(day.y, day.m - 1, day.d) + hours * 3600e3 + 30e3;
  return new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ms);
}

// Umm al-Qura Hijri date of a civil day, moved by the moon-sighting adjustment (days)
function hijriOf(day, adjust) {
  const noon = new Date(Date.UTC(day.y, day.m - 1, day.d + adjust, 12));
  const parts = (locale, month) => Object.fromEntries(new Intl.DateTimeFormat(`${locale}-u-ca-islamic-umalqura-nu-latn`, { timeZone: 'UTC', day: 'numeric', month, year: 'numeric' })
    .formatToParts(noon).map((x) => [x.type, x.value]));
  const ar = parts('ar', 'long');
  const en = parts('en', 'long');
  const num = parts('en', 'numeric');
  return { text: `${Number(num.day)} ${ar.month} ${parseInt(num.year, 10)}`, textEn: `${Number(num.day)} ${en.month} ${parseInt(num.year, 10)}`, month: Number(num.month) };
}

function calcDay(day, loc, zone) {
  const f = features.get();
  let method = methodFor(loc, f.prayerMethod);
  const hijri = hijriOf(day, f.hijriAdjust || 0);
  // Umm al-Qura: Isha two hours after Maghrib in Ramadan
  if (method.key === 'MAKKAH' && hijri.month === 9) method = { ...method, isha: '120 min' };
  const t = computeDay(day.y, day.m, day.d, loc.lat, loc.lon, method, f.asrHanafi ? 2 : 1);
  // the authority's own minute offsets, plus one minute of precaution on Asr so it is never
  // announced before the times people were used to (AlAdhan is up to a minute later on Asr)
  const tune = { asr: 1, ...method.tune };
  for (const [k, min] of Object.entries(tune)) t[k] += min / 60;
  const at = (h) => clockIn(zone, day, h);
  return {
    date: `${day.y}-${pad(day.m)}-${pad(day.d)}`,
    times: {
      imsak: at(t.fajr - 10 / 60),
      fajr: at(t.fajr),
      sunrise: at(t.sunrise),
      dhuhr: at(t.dhuhr),
      asr: at(t.asr),
      maghrib: at(t.maghrib),
      isha: at(t.isha),
    },
    hijri: hijri.text,
    hijriEn: hijri.textEn,
    hijriMonth: hijri.month, // 9 = Ramadan
    method: method.name,
    methodKey: method.key,
    // times are wall-clock times in this zone, which may differ from the PC's
    tz: zone,
  };
}

let enabled = false; // the master switch (features.islamic): nothing runs while it is off
let onUpdate = () => {};

async function refresh() {
  clearTimeout(midnightTimer);
  if (!enabled || !getLocation) return;
  try {
    const loc = await getLocation();
    const zone = loc.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const today = dayIn(zone, new Date());
    const next = new Date(Date.UTC(today.y, today.m - 1, today.d + 1));
    const tomorrow = { y: next.getUTCFullYear(), m: next.getUTCMonth() + 1, d: next.getUTCDate() };
    approx = !!loc.approx;
    data = { city: `${loc.city || ''}${approx ? ' (approx.)' : ''}`, today: calcDay(today, loc, zone), tomorrow: calcDay(tomorrow, loc, zone) };
    settings.save('prayer-cache.json', data);
    send('prayer', data);
    onUpdate();
    if (failed) console.warn('[prayer] back');
    failed = false;
    // next run just after local midnight
    const at = new Date();
    at.setHours(24, 1, 0, 0);
    midnightTimer = setTimeout(refresh, at.getTime() - Date.now());
  } catch (err) {
    // only when no location is known yet and the time zone has no fallback city: try again soon
    if (!failed) console.warn('[prayer]', err.message, '(retrying quietly)');
    failed = true;
    midnightTimer = setTimeout(refresh, 5 * 60 * 1000);
  }
}

// after sleep or a lost connection: recalculate now if the last run failed or was approximate
function retry() {
  if (enabled && (failed || approx)) refresh();
}

// Islamic features on or off: on starts the calculation and the midnight timer, off stops them.
function setEnabled(on) {
  if (on === enabled) return;
  enabled = !!on;
  if (enabled) refresh();
  else {
    clearTimeout(midnightTimer);
    midnightTimer = null;
  }
}

function start(sender, locate, on = false) {
  send = sender;
  getLocation = locate;
  setEnabled(on);
}

function snapshot() {
  return enabled ? data : null;
}

// for Settings: what is active right now
function info() {
  return { enabled, city: data?.city || '', method: data?.today?.method || '', methodKey: data?.today?.methodKey || '', timer: !!midnightTimer };
}

module.exports = { start, setEnabled, snapshot, refresh, retry, calcDay, info, METHODS, onUpdate: (fn) => { onUpdate = fn; } };
