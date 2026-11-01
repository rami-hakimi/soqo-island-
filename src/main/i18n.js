// Language of the app: the setting (auto / en / ar), resolved against Windows' display language.
// Loads the dictionaries once and hands renderers a payload { lang, dir, dict, fallback }.
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const I18n = require('../shared/i18n');

const LOCALES = path.join(__dirname, '..', 'locales');
const SUPPORTED = ['en', 'ar'];
const dicts = {};
for (const lang of SUPPORTED) {
  try {
    dicts[lang] = JSON.parse(fs.readFileSync(path.join(LOCALES, `${lang}.json`), 'utf8'));
  } catch (err) {
    console.error('[i18n] cannot load', lang, err.message);
    dicts[lang] = {};
  }
}

let setting = 'auto';
let current = null;
const listeners = [];

function systemLang() {
  const tag = (app.getLocale?.() || 'en').toLowerCase();
  return tag.startsWith('ar') ? 'ar' : 'en';
}

function resolve(value) {
  return SUPPORTED.includes(value) ? value : systemLang();
}

function build() {
  const lang = resolve(setting);
  current = I18n.create({ lang, dict: dicts[lang], fallback: dicts.en });
  return current;
}

// setting: 'auto' | 'en' | 'ar'. Returns true when the resolved language changed.
function setSetting(value) {
  const next = SUPPORTED.includes(value) ? value : 'auto';
  const before = current ? current.lang : null;
  setting = next;
  build();
  const changed = before !== current.lang;
  if (changed) listeners.forEach((fn) => fn(current));
  return changed;
}

const get = () => current || build();
const t = (key, params) => get().t(key, params);
const payload = () => {
  const i = get();
  return { lang: i.lang, dir: i.dir, dict: dicts[i.lang], fallback: dicts.en, setting };
};
const onChange = (fn) => listeners.push(fn);

module.exports = { setSetting, get, t, payload, onChange, SUPPORTED, resolve, systemLang, dicts };
