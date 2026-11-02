# Localisation guide

Soqo Island ships English, Arabic and Dutch. The interface language follows Windows' display
language by default (Arabic or Dutch Windows → that language, anything else → English) and
can be fixed in Settings › General › Language.

## Files
- `src/locales/en.json` — source of truth for keys (473).
- `src/locales/ar.json` — Arabic (480 incl. the extra plural forms).
- `src/locales/nl.json` — Dutch, Netherlands usage (473).
- `src/shared/i18n.js` — core: `create({ lang, dict, fallback })` → `{ t, lang, dir, locale }`
  and `applyDom(i18n, root)`.
- `src/main/i18n.js` — resolves `auto`, loads dictionaries, serves `{ lang, dir, dict,
  fallback, setting }` to renderers (`i18n-get-sync` at preload time, `i18n` event on change).
- `scripts/i18n-check.js` — gate run by `npm run verify`: key parity and placeholder parity for
  every dictionary in `OTHERS`, unknown keys in code, hardcoded text in pages.

## Writing strings
- In pages: `<b data-i18n="p.general.show">Show island</b>`; attributes with
  `data-i18n-title`, `data-i18n-aria`, `data-i18n-placeholder`, `data-i18n-alt`. The English
  text stays in the markup as the fallback and for readability.
- In scripts: `t('dl.noteDone', { name })`. Markup inside a dictionary string is allowed only
  for keys rendered with `innerHTML` by code that already treats them as trusted (`<b>`
  emphasis in cards); user-provided values are always escaped before interpolation.
- Plurals: `t('shelf.count', { count: n })` picks `shelf.count_one`, `_two`, `_few`, `_many`,
  `_other` (and `_zero`) with `Intl.PluralRules`; `{n}` carries the number.
- Dates and times: pass `LOCALE()` as the locale argument (`undefined` = system locale for
  English, `ar-u-nu-latn` for Arabic so digits stay Latin like the rest of the island,
  `nl-NL` for Dutch: `ma 2 nov`, `14:05`).
- Isolate embedded LTR runs inside Arabic text with `<bdi dir="ltr">` or U+2066…U+2069
  (versions, times, file names) — see `prefs.js` version line.
- Religious source text (Qur'an verses, adhkar, du'as, the scene title «أَقِمْ صَلَاتَكَ») is never
  put in the dictionaries and never translated or restyled.

## Right-to-left
`applyDom` sets `<html lang dir>`. Prefer logical CSS (`inset-inline-*`, `margin-inline-*`,
`padding-inline-*`, `text-align: start`). The island's physical positioning (`--x/--y`) is
screen geometry and stays physical. Soqi uses `inset-inline-end`, so she mirrors too.

## Adding a language
1. Copy `en.json` to `src/locales/<lang>.json` and translate.
2. Add the code to `SUPPORTED` and `systemLang()` in `src/main/i18n.js`, to `ENUMS.lang` in
   `features.js`, to `OTHERS` in `scripts/i18n-check.js`, and a button to the Language selector
   in `src/renderer/prefs/index.html` (+ `p.general.lang<Xx>` keys with the language's native
   name in every dictionary). Add the Chromium locale to `build.electronLanguages` and the NSIS
   language to `build.nsis.installerLanguages` in `package.json`.
3. If the script is right-to-left, add it to `RTL` in `src/shared/i18n.js`; give it a locale
   tag in `create()` if dates should not follow the system locale.
4. Add a parity test next to the Dutch one in `test/i18n.test.js`; run `npm run verify`.

## Review status
The Arabic and Dutch dictionaries were written during the rebuild and read naturally, but
neither has been reviewed by a second native speaker yet; corrections are welcome as pull
requests against `ar.json` or `nl.json` only. Hijri month names are available in Arabic and
English; the Dutch interface shows the English transliterations.
