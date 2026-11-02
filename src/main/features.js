// Which parts of the island are on. Edited in the Settings window, applied live by the island.
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const settings = require('./settings');
const migrate = require('./migrate');
const Islamic = require('../shared/islamic');
const { METHODS } = require('./prayer-methods');

const DEFAULTS = {
  // language of the interface: auto (Windows' display language), en, ar, nl
  lang: 'auto',
  // expanded tabs
  tabMedia: true,
  tabApps: true,
  tabShelf: true,
  tabPrayer: true,
  tabTimer: true,
  tabSystem: true,
  tabActivity: true,
  // idle pill slides
  slideClock: true,
  slideStats: true,
  slidePrayer: true,
  // live activities
  mediaPill: true,
  mediaTitle: true,
  trackPeek: true,
  // notifications
  kbdToast: true,
  capsToast: true,
  hudVolume: true,
  hudBrightness: true,
  battery: true,
  // Islamic features: optional, off for new installations; the master gates everything
  // prayer / dhikr / Qur'an related (see shared/islamic.js). The individual switches below
  // keep their own values for when the master is turned on.
  islamic: false,
  islamicPrompt: false, // a profile imported from Nova Island: ask once whether to keep them
  prayerMethod: 'auto', // calculation method: auto (by country) or a key of prayer-methods.js
  adhanSound: true, // the soft chime at the adhan (prayer notifications must be on too)
  prayerAlerts: true,
  asrHanafi: false, // Asr by the Hanafi shadow rule
  hijriAdjust: 0, // days added to the Hijri date (local moon sighting)
  // IDM
  downloads: true,
  dlToasts: true,
  folderDownloads: true, // browser downloads, seen in the download folders
  // window
  hideFullscreen: true,
  autoUpdate: true, // download new versions from GitHub and offer a restart on the island
  addrIsland: false, // opt-in: take the right third of a Chromium browser's address bar while it is in front
  hideMaximized: false, // hide while a maximized app is in front (full screen has its own switch)
  // System tab
  clipboardHistory: true,
  // copied image / screenshot -> toast; on the Shelf by itself for a while, or "Add to Shelf"
  screenshotToast: true,
  shotAutoShelf: true,
  shotShelfMinutes: 20,
  // mic / camera in use (shows who uses them; it does not block anything)
  privacyDots: true,
  // the glass: live = the screen area under the island is captured and blurred (never leaves
  // the app); off = a plain dark pane and no capture at all
  liveGlass: true,
  // companion (master: Soqi shown at all)
  companion: true,
  netToasts: true,
  welcomeBack: true,
  morningBrief: true,
  wellbeing: true,
  smartClipboard: true,
  soqiEyes: true,
  soqiPrayer: true, // Soqi in her prayer cap at the adhan
  soqiFocus: true, // Soqi with her headphones at focus start / end
  soqiReacts: true, // Soqi reacts to downloads, alerts, music, and your return
  soqiMotion: true, // Soqi's small movements (off: still pictures only)
  soqiClicks: true, // a click on Soqi gets a playful reaction
  water: true, // the Drop reminds you to drink
  waterEvery: 60, // minutes at the computer between glasses
  waterGoal: 8, // glasses a day (~2 L)
  celebrate: true,
  // upcoming meetings (iCal link in calendar.json)
  meetings: true,
  // reminders: dhikr, du'a, Qur'an
  reminders: true,
  remindAyah: true,
  remindDhikr: true,
  remindDua: true,
  remindEvery: 5, // minutes
  remindFor: 30, // seconds on screen
  // quiet hours for reminders (minutes after midnight; may wrap past midnight)
  quietHours: false,
  quietFrom: 23 * 60,
  quietTo: 7 * 60,
  // running timer pill (Settings › Timer): size of the countdown, and whether a running timer
  // stays visible while an app is full screen
  timerSize: 'small',
  timerOnTop: false,
  // focus sessions (Pomodoro)
  focusMin: 25,
  breakMin: 5,
  longBreakMin: 15,
  // coding agents (Claude Code, Codex CLI): opt-in; each agent is connected separately in Settings
  agents: false,
  agentsExpand: false, // an approval request opens the island on the Activity tab for a moment
  agentsInFocus: false, // approval requests also reach the Focus Mode view
  agentsHideDetails: false, // show only the tool's name, never the command or file
  agentsSound: true,
  agentAlertSec: 15, // how long an approval alert stays on the island
  // Windows notifications on the island (Windows' notification listener): opt-in
  notifMirror: false,
  notifPreview: true, // off: app and title only, never the message text
};

// string settings and their allowed values
const ENUMS = { lang: ['auto', 'en', 'ar', 'nl'], prayerMethod: ['auto', ...Object.keys(METHODS)], timerSize: ['small', 'medium', 'large'] };
// number settings and their allowed range
const RANGES = {
  remindEvery: [1, 240], remindFor: [5, 300], quietFrom: [0, 1439], quietTo: [0, 1439],
  focusMin: [5, 120], breakMin: [1, 60], longBreakMin: [5, 60], hijriAdjust: [-2, 2], waterEvery: [15, 240], waterGoal: [4, 16], shotShelfMinutes: [5, 1440], agentAlertSec: [5, 120],
};

// settings saved by Nova Island keep working: renamed keys are mapped once and saved back
const stored = settings.load('features.json', {});
let mapped = migrate.featureKeys(stored);
// a profile copied from Nova Island (no master switch there): decide once what it meant
if (!('islamic' in mapped) && fs.existsSync(path.join(app.getPath('userData'), migrate.MARKER))) {
  const d = Islamic.fromNova(mapped);
  mapped = { ...mapped, islamic: d.islamic, islamicPrompt: d.prompt };
}
let values = { ...DEFAULTS, ...pick(mapped) };
if (JSON.stringify(mapped) !== JSON.stringify(stored)) settings.save('features.json', values);
const listeners = [];

// keep only known keys with values of the right type (numbers clamped to their range)
function pick(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (!(k in DEFAULTS)) continue;
    if (RANGES[k]) {
      if (Number.isFinite(v)) out[k] = Math.min(Math.max(Math.round(v), RANGES[k][0]), RANGES[k][1]);
    } else if (ENUMS[k]) {
      if (ENUMS[k].includes(v)) out[k] = v;
    } else if (typeof v === 'boolean') out[k] = v;
  }
  return out;
}

function get() {
  return { ...values };
}

function set(patch) {
  const clean = pick(patch);
  if (!Object.keys(clean).length) return values;
  values = { ...values, ...clean };
  settings.save('features.json', values);
  listeners.forEach((fn) => fn(get()));
  return get();
}

function reset() {
  values = { ...DEFAULTS };
  settings.save('features.json', values);
  listeners.forEach((fn) => fn(get()));
}

const onChange = (fn) => listeners.push(fn);

module.exports = { get, set, reset, onChange, DEFAULTS };
