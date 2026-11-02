// Localisation gate: dictionary parity, keys used in code but missing from en.json, keys in
// en.json that nothing uses, and visible text left hardcoded in the pages.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/en.json'), 'utf8'));
const OTHERS = ['ar', 'nl'];
const dicts = Object.fromEntries(OTHERS.map((l) => [l, JSON.parse(fs.readFileSync(path.join(ROOT, `src/locales/${l}.json`), 'utf8'))]));
const base = (k) => k.replace(/_(zero|one|two|few|many|other)$/, '');
let bad = 0;
const fail = (msg) => { bad++; console.error('✖', msg); };

// 1. parity (plural forms compared by base key) and matching placeholders
const enBase = new Set(Object.keys(en).map(base));
const ph = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join(',');
for (const [l, d] of Object.entries(dicts)) {
  const other = new Set(Object.keys(d).map(base));
  for (const k of enBase) if (!other.has(k)) fail(`${l}.json missing ${k}`);
  for (const k of other) if (!enBase.has(k)) fail(`en.json has no ${k} (present in ${l}.json)`);
  for (const k of Object.keys(en)) {
    if (!(k in d) || /_(zero|one|two|few|many|other)$/.test(k)) continue;
    if (ph(d[k]) !== ph(en[k])) fail(`${l}.json placeholders differ for ${k}`);
  }
}

// 2. keys referenced in code
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|html)$/.test(e.name)) out.push(p);
  }
  return out;
}
const files = walk(path.join(ROOT, 'src')).filter((f) => !f.endsWith(path.join('shared', 'i18n.js')));
const used = new Set();
const KEY = /\bt\(\s*['"`]([\w.]+)['"`]|data-i18n(?:-\w+)?="([\w.]+)"|\bI18N\.t\(\s*['"`]([\w.]+)['"`]|i18n\.t\(\s*['"`]([\w.]+)['"`]/g;
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(KEY)) {
    const k = m[1] || m[2] || m[3] || m[4];
    used.add(k);
    if (!enBase.has(k) && !(k in en)) fail(`${path.relative(ROOT, f)} uses unknown key ${k}`);
  }
}
// keys built dynamically (prefix + variable): declared here so the unused check skips them
const DYNAMIC_PREFIXES = ['prayer.', 'weather.', 'reminder.', 'p.trouble.helper', 'unit.', 'dl.', 'greet.', 'care.', 'p.saved', 'p.location.', 'p.cal.'];
for (const k of enBase) {
  if (used.has(k)) continue;
  if (DYNAMIC_PREFIXES.some((p) => k.startsWith(p))) continue;
  console.warn('⚠ unused key', k);
}

// 3. hardcoded visible text in pages: text nodes with letters outside data-i18n elements
const ALLOW = new Set(['Ctrl', 'Alt', 'I', 'CPU', 'RAM', 'm', 'Soqo Island', 'Soqo Island Settings', 'Mini Player', 'Google:', 'Outlook:', 'GitHub', 'IDM Nova', 'Wi-Fi']);
for (const f of files.filter((x) => x.endsWith('.html'))) {
  let s = fs.readFileSync(f, 'utf8').replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
  // drop elements that carry a translation attribute (their text is replaced at runtime)
  s = s.replace(/<([a-z0-9]+)[^>]*data-i18n(?:-html)?="[^"]*"[^>]*>[^<]*/g, '<$1>');
  for (const m of s.matchAll(/>([^<>]+)</g)) {
    const text = m[1].trim();
    if (!text || !/[A-Za-z؀-ۿ]{2,}/.test(text) || ALLOW.has(text)) continue;
    // Qur'anic / Arabic-script source text inside lang="ar" data is allowed in the island page
    if (/^[؀-ۿ\s]+$/.test(text) && f.includes('island')) continue;
    fail(`${path.relative(ROOT, f)}: hardcoded text "${text.slice(0, 60)}"`);
  }
  // attributes: flagged only when the same tag has no data-i18n-<kind> companion
  const KIND = { title: 'title', 'aria-label': 'aria', placeholder: 'placeholder', alt: 'alt' };
  for (const tag of s.matchAll(/<[a-z0-9]+\s([^<>]*)>/g)) {
    for (const m of tag[1].matchAll(/(?:^|\s)(title|aria-label|placeholder|alt)="([^"]{2,})"/g)) {
      if (!/[A-Za-z]{3,}/.test(m[2])) continue;
      if (tag[1].includes(`data-i18n-${KIND[m[1]]}=`)) continue;
      fail(`${path.relative(ROOT, f)}: hardcoded ${m[1]} "${m[2].slice(0, 60)}"`);
    }
  }
}
console.log(`i18n: ${Object.keys(en).length} en keys, ${OTHERS.map((l) => `${Object.keys(dicts[l]).length} ${l}`).join(', ')} keys, ${used.size} used, ${bad} problems`);
process.exit(bad ? 1 : 0);
