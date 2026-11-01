# Soqo Island — Migration Plan

Soqo Island (سوكو آيلاند, "A Living Island for Windows") is a fork of **Nova Island 1.4.0**
(https://github.com/NOVA-TECH-KIT/nova-island, GPL-3.0-only, © 2026 Nova Island by AmerTech).
This document is the result of a full read of the upstream codebase (every JS, HTML, CSS, C#
and config file; 9,677 lines excluding `promo/`) and is the single plan for migrating,
modernising, securing and rebranding it. Nothing in the inventory below is to be removed.

Upstream's README states that the name "Nova Island" and its logo are **not** covered by the
GPL and asks modified versions to use a different name. The rebrand is therefore a licence
obligation as well as a product decision. The GPL text, the upstream copyright line and the
KFGQPC font licence are retained (see §7).

Related documents: `MIGRATION_STATUS.md` (stage log), `REGRESSION_CHECKLIST.md` (feature by
feature verification), `SECURITY_AUDIT.md` (findings), `ART_ASSET_REQUESTS.md` (artwork).

---

## 1. Architecture as imported

| Layer | Files | Notes |
|---|---|---|
| Electron main | `nova.js` (entry, 1,044 lines) | Window placement, drag, tray, menus, IPC hub, backdrop capture, hover polling, screenshot capture, startup registration, setup mode |
| Main modules | `settings.js` `features.js` `log.js` `apps.js` `shelf.js` `system.js` `smartclip.js` `prayer.js` `downloads.js` `browser-downloads.js` `privacy.js` `calendar.js` `network.js` `mini.js` `prefs-window.js` `updater.js` | Plain CommonJS, no bundler, no TypeScript, no tests |
| Island renderer | `index.html` `style.css` `renderer.js` `views/*.js` (19 files) `preload.js` | Classic scripts sharing globals (`state`, `render`, `showToast`, `playScene`…) loaded in order; `contextIsolation: true`, `nodeIntegration: false`, **no `sandbox`** |
| Settings window | `prefs/index.html` `prefs/prefs.css` `prefs/prefs.js` `prefs/preload.js` | Sandboxed, CSP without `unsafe-inline` |
| Mini player | `mini/index.html` `mini/mini.css` `mini/mini.js` `mini/preload.js` + local HTTP server in `mini.js` | YouTube iframe API; served from 127.0.0.1 for a real origin |
| Native helper | `helper/NovaHelper.cs` `Apps.cs` `YtUrl.cs` `AddressBar.cs` `build.cmd` → `helper/nova-helper.exe` | C# 5 compiled with the csc shipped in Windows; SMTC media, volume (Core Audio COM), brightness (WMI), fullscreen, foreground window, keyboard layout, Caps Lock, clipboard sequence + privacy flag, idle time, Chromium omnibox via UI Automation, Start-menu catalogue, YouTube tab URL |
| Packaging | `package.json` (electron-builder NSIS + portable), `Setup Nova Island.cmd` (dev setup) | Electron 44.7.2, electron-builder 26.17, electron-updater 6.8, node-ical 0.27 |
| Assets | `build/icon.png` `build/icon.ico` (Nova logo, must be replaced), `fonts/KFGQPC-Hafs-V30.ttf` + licence | |
| Non-shipping | `promo/` (screenshots, scene renderer, Python build scripts) | Excluded from the build; contains Nova character artwork and branding |

Data folder: `%APPDATA%\dynamic-nova` (forced via `app.setPath('userData')`). Files inside:
`settings.json` (position/orientation), `features.json`, `apps.json`, `apps-cache.json`,
`shelf.json`, `prayer-cache.json`, `weather-cache.json`, `location.json`,
`location-cache.json`, `calendar.json` (secret iCal URL), `download-folders.json`,
`mini.json`, `nova.log`, `renamed` marker. Renderer `localStorage`: `nova-brief-day`,
`nova-water`, `prefs-page`.

External endpoints used: `ipwho.is`, `get.geojs.io`, `ipapi.co` (IP geolocation),
`api.open-meteo.com` + `geocoding-api.open-meteo.com` (weather, city search),
`www.msftconnecttest.com` (connectivity), `127.0.0.1:17890` (IDM Nova bridge, a separate
product by the upstream author), `github.com` releases (updater), user's iCal URL,
`www.youtube.com` embed (mini player), download thumbnail URLs reported by IDM Nova.

---

## 2. Feature inventory

Each row: feature → implementing files → verification required after migration.
"Auto" = covered by an automated test we add; "Manual (Win)" = needs a Windows desktop session.

### 2.1 Island shell
| # | Feature | Files | Verify |
|---|---|---|---|
| S1 | Floating always-on-top transparent pill, click-through until hover intent (280 ms) | `nova.js` createWindow/pollCursor/setActive, `renderer.js` | Manual (Win): hover opens after dwell, quick sweep does not |
| S2 | Modes idle / compact / toast / peek / reminder / scene / expanded with morph animation | `renderer.js` currentMode/render, `style.css` | Manual (Win) + Auto (mode priority unit test once extracted) |
| S3 | Drag to move, dock to top edge (snap 28 px), centre magnet, "placed" memory | `nova.js` drag-*, `renderer.js` pointer handlers | Manual (Win) |
| S4 | Vertical mode docked left/right, side switch while dragging | `nova.js` setVertical/followCursor, `.vertical` CSS, `VDIMS` | Manual (Win) |
| S5 | Multi-monitor: anchor clamped to nearest display; re-layout on display changes | `nova.js` layout, `screen.on(...)` | Manual (Win, 2 displays) |
| S6 | Browser address-bar slot (island sits in right third of Chromium omnibox; thin line while typing) | `helper/AddressBar.cs`, `nova.js` onOmni/layoutAddressBar, `.addr-*` CSS | Manual (Win, Chrome/Edge) |
| S7 | Hide in fullscreen apps; Show/Hide from menu | `helper IsFullscreen`, `nova.js` updateVisibility | Manual (Win) |
| S8 | Live glass backdrop (screen capture under the island, blurred in canvas; content protection) | `nova.js` captureBackdrop, `renderer.js` onBackdrop/frame | Manual (Win) |
| S9 | Global shortcut Ctrl+Alt+I expand/collapse; pin | `nova.js` globalShortcut, `renderer.js` onToggle | Manual (Win) |
| S10 | Tray icon + context menu (show, vertical, reset, startup, settings, quit) | `nova.js` buildTray/appMenu | Manual (Win) |
| S11 | Single instance lock; `--setup` second-instance handling | `nova.js` | Manual (Win) |
| S12 | Reduced-motion support (global media query) | all CSS files | Auto (CSS contains rule) + Manual |
| S13 | Keyboard focus only while typing in inputs (`focus-input`) | `nova.js`, `views/apps.js` | Manual (Win) |

### 2.2 Media
| # | Feature | Files | Verify |
|---|---|---|---|
| M1 | Now-playing from Windows SMTC: title, artist, album, art, position, duration | `helper/NovaHelper.cs`, `renderer.js` onMedia | Manual (Win, Spotify/YouTube) |
| M2 | Transport: play/pause/next/prev/seek; optimistic play lock | `renderer.js`, helper commands | Manual (Win) |
| M3 | System volume slider, mute, wheel-to-volume, HUD toast | helper `Audio`, `renderer.js` | Manual (Win) |
| M4 | Brightness slider (laptops, WMI) + HUD | helper `Brightness`, `renderer.js` | Manual (Win laptop) |
| M5 | Compact pill with art, scrolling title, equaliser; track-change peek; accent colour from artwork | `renderer.js`, `style.css` | Manual (Win) |
| M6 | "Media in front" suppression (no duplicate when the player tab is active) | `renderer.js` isMediaInFront | Manual (Win) |
| M7 | Mini player: pop a YouTube tab out (pause tab → find URL via UI Automation → embed → seek back on close) | `nova.js` mini-open, `mini.js`, `mini/*`, `helper/YtUrl.cs` | Manual (Win, Chrome) |
| M8 | Media session isolation (`HardwareMediaKeyHandling` disabled) | `nova.js` | Manual (Win) |

### 2.3 Apps, Shelf, Timer, System
| # | Feature | Files | Verify |
|---|---|---|---|
| A1 | Start-menu catalogue scan (helper `apps`), cache, default pins, add/remove/reorder (FLIP drag), launch via `shell:AppsFolder` | `apps.js`, `helper/Apps.cs`, `views/apps.js` | Auto (helper runs, JSON parses) + Manual |
| A2 | App icons (Store PNG logos or `getFileIcon`) | `apps.js` iconFor | Manual (Win) |
| F1 | Shelf: drop files, drag out (`startDrag`), open, reveal, clear, 24-item cap, timed items | `shelf.js`, `views/shelf.js`, `preload.js` addFiles | Manual (Win) |
| T1 | Timer presets, ring, sounds (shared AudioContext) | `renderer.js` timer section | Manual (Win) |
| T2 | Focus sessions (Pomodoro, long break every 4th), companion scene at start/end | `renderer.js` startPhase | Manual (Win) |
| Y1 | CPU/RAM meters (idle slide + System tab) | `system.js` tickStats, `views/system.js` | Manual |
| Y2 | Weather (Open-Meteo; IP location with 3 fallbacks; manual city; offline cache; time-zone capital fallback) | `system.js`, `views/system.js`, `prefs` location | Auto (location fallback logic) + Manual |
| Y3 | Clipboard history (memory only, 8 items, private copies skipped) | `system.js`, helper `ClipboardPrivate`, `views/system.js` | Manual (Win) |
| Y4 | Smart clipboard: URL → open/download, colour swatch, safe arithmetic, word count | `smartclip.js`, `nova.js` clip-action, `views/smartclip.js` | **Auto** (`classify`/`calc` unit tests) |
| Y5 | Copied image / screenshot toast, save to `Pictures\<App>`, auto-shelf with expiry, Snipping Tool file detection | `nova.js` onClipboardSeq/shotToShelf, `views/screenshot.js` | Manual (Win) |
| Y6 | Network status: link kind, Windows connectivity probe, toasts, "back online" wake hook | `network.js`, `views/network.js` | Auto (linkKind with mocked interfaces) + Manual |
| Y7 | Battery toasts | `renderer.js` navigator.getBattery | Manual (Win laptop) |
| Y8 | Keyboard language + Caps Lock toasts | helper, `views/keyboard.js` | Manual (Win) |

### 2.4 Downloads
| # | Feature | Files | Verify |
|---|---|---|---|
| D1 | IDM Nova live bridge (token from `%APPDATA%\app.idmnova.desktop\bridge.token`, `/activity`, `/control`), launch, outdated detection | `downloads.js` | Manual (Win + IDM Nova) — third-party product; integration preserved as-is |
| D2 | Browser downloads by watching download folders for partial files (.crdownload/.part/…); completion detection incl. Chrome "Unconfirmed" | `browser-downloads.js` | **Auto** (temp-folder simulation) |
| D3 | Download folders management in Settings | `nova.js` dl-folder-*, `prefs` | Manual |
| D4 | Downloads tab (auto-shown for 1 h), compact ring pill, liquid progress line, start/done/failed toasts, thumbnails inlined as data URLs | `views/downloads.js`, `style.css` | Manual |

### 2.5 Prayer & Islamic features
| # | Feature | Files | Verify |
|---|---|---|---|
| P1 | Local prayer-time calculation (PrayTimes algorithm, 20 authority methods, country → method mapping, Hanafi Asr, high-latitude rule, Ramadan Umm al-Qura Isha) | `prayer.js` | **Auto** (golden values for Cairo/Makkah/London on fixed dates) |
| P2 | Hijri date (Umm al-Qura via Intl) with ±2 day adjustment; Ramadan imsak/iftar countdown | `prayer.js` hijriOf, `views/prayer.js` | **Auto** (hijriOf golden dates) |
| P3 | Prayer tab (RTL Arabic), next-prayer countdown, idle slide, vertical slide | `views/prayer.js`, `index.html` | Manual |
| P4 | Alerts 10 min before + at adhan (chime, companion scene with prayer cap, Ramadan iftar greeting) | `views/prayer.js` remind | Manual (time-shift) |
| P5 | Dhikr / du'a / Qur'an reminder cards (KFGQPC Hafs font, verse ornaments, shuffled bag, quiet hours, interval, duration, preview) | `views/reminders.js`, `views/reminders-data.js`, `style.css` | **Auto** (quiet-hours wrap logic, bag never repeats) + Manual |
| P6 | Religious source text and attribution are preserved byte-for-byte | `views/reminders-data.js`, `fonts/` | **Auto** (checksum test of the reminders data) |

### 2.6 Companion (Nova → Soqi)
| # | Feature | Files | Verify |
|---|---|---|---|
| C1 | Eyes in the idle pill that follow the cursor after a 3 s dwell, blink | `views/nova.js`, `nova.js` sendNear, `.l-eyes` CSS | Manual |
| C2 | Scenes: island morphs into a character with a card (adhan, water drop, focus) incl. props cap/rug/band/laptop/glass and arm poses | `views/scene.js`, `index.html` `.sc`, `style.css` scenes | Manual |
| C3 | Welcome back (with happenings), morning/evening brief, break care cards after 50 min | `views/companion.js`, `views/reminders.js` showCard | Manual (idle simulation) |
| C4 | Water reminders with daily goal, snooze, localStorage count | `views/water.js` | Manual |
| C5 | Celebrations (sparkles) | `renderer.js` celebrate | Manual |
| C6 | Meeting reminders from iCal (10/1 min, Join button for Meet/Teams/Zoom/Webex only) | `calendar.js`, `views/calendar.js` | **Auto** (`occurrences`, `isJoinLink`) |
| C7 | Privacy dots (mic orange / camera green) from CapabilityAccessManager registry, toasts naming the app | `privacy.js`, `views/privacy.js` | **Auto** (`parse`/`appName`) + Manual |

### 2.7 Settings, startup, updates
| # | Feature | Files | Verify |
|---|---|---|---|
| G1 | Settings window: 7 pages, search, steppers, dependent rows, saved toast, Esc, remembered page | `prefs/*` | Manual |
| G2 | 60+ feature switches with ranges and validation; live apply | `features.js` | **Auto** (`pick` clamps and drops unknown keys) |
| G3 | Start with Windows (login item when packaged, Startup `.lnk` in dev), desktop shortcut via `--setup` | `nova.js` | Manual (Win) |
| G4 | Startup migration from the pre-rename "Dynamic Nova" build | `nova.js` migrateStartup | Manual (Win) — extend to migrate Nova Island → Soqo Island |
| G5 | Auto-update from GitHub releases, 10 s countdown toast, install on quit | `updater.js`, `views/update.js` | Manual (packaged build + release) |
| G6 | Error log (1 MB rotation, no private data) + "Copy report" | `log.js` | Auto (rotation) |
| G7 | Support links (Ko-fi, InstaPay, GitHub) | `nova.js` SUPPORT_LINKS, prefs Support page | Manual — **owner decision** on which links to keep (see §8) |
| G8 | NSIS installer, portable build, asar unpack of helper | `package.json` build | Manual (Win build) |

---

## 3. Target architecture

Electron/Node is kept. No Tauri/Rust migration (would need a separate evaluation: SMTC, UI
Automation, Core Audio and transparent click-through windows are all re-implementable but it
is a rewrite, not a port).

```
soqo-island/
├─ src/
│  ├─ main/            Electron main process (entry main.js + feature modules)
│  ├─ preload/         context-bridge scripts (island, prefs, mini)
│  ├─ renderer/
│  │  ├─ island/       index.html, style.css, renderer.js, views/
│  │  ├─ prefs/        settings window
│  │  └─ mini/         mini player
│  ├─ shared/          pure, testable logic usable by main and renderer
│  │                   (prayer maths, smart clipboard, i18n core, companion state machine)
│  └─ locales/         en.json, ar.json
├─ helper/             C# sources + build.cmd → soqo-helper.exe (unpacked from asar)
├─ assets/             icons, Soqi artwork, fonts (KFGQPC kept unmodified + licence)
├─ test/               node:test suites for src/shared and main modules that are pure
├─ docs/               this plan, status, checklist, security, art requests, i18n, release
└─ build/              electron-builder resources
```

Moves are done with `git mv` to keep history. Every move stage ends with: syntax check of all
files, unit tests, a real Electron launch on Windows that reaches `island-ready`, and a
packaged build when the packaging config changed.

TypeScript is introduced gradually: `tsconfig.json` with `checkJs` + JSDoc types first
(`tsc --noEmit` becomes a lint gate), then `src/shared` converted to `.ts` with a tiny build
step, then preloads, then main. Renderers stay plain scripts until a bundler is justified.

---

## 4. Stages

| Stage | Scope | Exit criteria |
|---|---|---|
| 0 | Import with history, remotes (`origin` new, `upstream` old, push to upstream disabled), branch `rebuild/soqo-island` | Done |
| 1 | Audit documents, regression checklist, test harness (`node:test`), lint (`node --check`, ESLint flat config), first unit tests for pure modules | `npm test`, `npm run lint` green |
| 2 | Branding: package/installer metadata, titles, tray, menus, README, scripts, helper exe name; **data migration** `dynamic-nova` → `soqo-island`, startup links, `Pictures\Nova Island`, localStorage keys; IDM Nova integration untouched (third-party) | Electron launches, island-ready logged, migration test passes |
| 3 | Project structure (`src/…`) and `@ts-check` + JSDoc types + `tsc --noEmit` gate | Launch + tests green, packaged build produced locally |
| 4 | Security hardening (see `SECURITY_AUDIT.md`): sandbox on all renderers, stricter IPC validation, Electron fuses, CSP on mini page tightened, permission handlers, `will-attach-webview` deny, log scrubbing review | Checklist items closed with tests where possible |
| 5 | Localisation: `src/locales/{en,ar}.json`, `t()` in main and renderers, language setting (auto/en/ar), RTL layouts for prefs and island expanded view, Arabic dates/numbers, hardcoded-string scan script; religious text untouched | `npm run i18n:check` reports no missing keys; manual RTL review |
| 6 | Soqi companion: original SVG/CSS dolphin, state machine (idle, sleep, happy, curious, music, notify, download-done, warning), hooks from existing events; settings renamed with migration (`novaEyes`→`soqiEyes` …) | Scenes and eyes work; `ART_ASSET_REQUESTS.md` lists anything not drawn in code |
| 7 | Visual refresh: ocean dark-glass tokens (turquoise/cyan/blue accents), new app icon, animation polish, DPI/multi-monitor checks, reduced motion audit | Screenshots reviewed by owner |
| 8 | Docs & release engineering: README (EN/AR), ARCHITECTURE, LOCALIZATION, PRIVACY, SECURITY.md, RELEASING; GitHub Actions Windows build (no publish); updater pointed at new repo | Owner authorises first release |

Stages 1–3 are executed first. Later stages each produce their own status entry.

---

## 5. Rebranding rules

- User-visible: "Nova Island" → "Soqo Island" / "سوكو آيلاند"; companion "Nova" → "Soqi";
  tagline "A Living Island for Windows".
- Package: `name` `soqo-island`, `productName` "Soqo Island", `appId` `com.soqoisland.app`,
  `executableName` "Soqo Island", artifacts `Soqo-Island-Setup-${version}.exe`, publish
  `rami-hakimi/soqo-island-`.
- Internal identifiers may be renamed when safe (`window.nova` bridge → `window.soqo`,
  `nova-helper.exe` → `soqo-helper.exe`, font alias "Nova Quran" → "Soqo Quran") because they
  are not persisted. Persisted names (`dynamic-nova` folder, `features.json` keys, localStorage
  keys, `.lnk` names) get a **migration** that copies/renames once and never deletes old data.
- Not renamed: "IDM Nova" (a separate third-party download manager this app integrates with),
  its `x-nova-token` header and `app.idmnova.desktop` paths, "PrayTimes", "KFGQPC",
  "Open-Meteo".
- Legal: `LICENSE` (GPL-3.0) kept verbatim; copyright notice becomes
  "© 2026 Soqo Island contributors. Based on Nova Island © 2026 Nova Island by AmerTech
  (GPL-3.0)". Font licence kept verbatim. `NOTICE.md` lists third-party components.
- Artwork: `build/icon.*` and all `promo/` Nova imagery are upstream brand assets; they are
  replaced (icon) or quarantined out of the build and documented as not-for-reuse (promo).

---

## 6. Testing strategy

- **Unit (node:test, runs anywhere):** `smartclip.classify/calc`, `prayer.computeDay/hijriOf`
  golden values, `features.pick`, `privacy.parse/appName`, `calendar.occurrences/isJoinLink`,
  `browser-downloads` state machine on a temp dir, `network.linkKind`, i18n key parity,
  reminders data checksum, settings migration.
- **Static:** `node --check` on every script, ESLint, `tsc --noEmit` (checkJs), hardcoded
  string scan, CSP presence check on every HTML page.
- **Windows integration (this machine is Windows 11, so these *can* run here):** helper
  `apps` subcommand returns a catalogue (verified: 183 apps); Electron launch reaching
  `island-ready` with an isolated `SOQO_USER_DATA` folder; packaged NSIS build.
- **Manual (owner):** media control against real players, address-bar slot, multi-monitor,
  mini player, auto-update against a published release.

Electron's own modules cannot be loaded under plain Node, so main-process modules that touch
`electron` are tested through a small `electron` stub registered with `--import` in the test
runner, or by extracting their pure parts into `src/shared`.

---

## 7. Legal and attribution checklist

- [x] GPL-3.0 `LICENSE` retained verbatim
- [x] Upstream copyright preserved in `package.json` `copyright`, README and `NOTICE.md`
- [x] `fonts/KFGQPC-LICENSE.txt` retained; font unmodified
- [x] Qur'an text (`reminders-data.js`) unchanged — guarded by checksum test
- [x] Nova name/logo removed from shipped artefacts (licence requirement from upstream); `promo/` imagery is excluded from the build and slated for replacement
- [x] Third-party notices: Electron, electron-updater, node-ical, PrayTimes (LGPL algorithm
      reference), Open-Meteo attribution (`NOTICE.md`)

---

## 8. Owner decisions needed (not blocking stages 1–3)

1. **Support links** — upstream Ko-fi / InstaPay belong to the upstream author. Keep (as
   "support the original project"), replace with your own, or remove the Support page?
2. **Update channel** — releases from `rami-hakimi/soqo-island-` once the first tag exists.
   Code signing certificate available? (Affects SmartScreen and updater trust.)
3. **IDM Nova integration** — keep as-is (recommended; it is optional and off when IDM Nova is
   absent) or hide behind a setting that defaults off.
4. **Data migration policy** — copy `dynamic-nova` → `soqo-island` on first run and leave the
   old folder (recommended), or move it.
5. **Telemetry** — none exists; confirm "none" stays the policy (recommended).
