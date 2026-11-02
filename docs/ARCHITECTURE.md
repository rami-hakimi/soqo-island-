# Architecture

Soqo Island is an Electron 44 application with a compiled C# helper for the Windows
integrations. There is no bundler: the renderers are classic scripts, the main process is
CommonJS, and TypeScript runs in `checkJs` mode as a gate (`npm run typecheck`).

```
src/
├─ main/            Electron main process
│  ├─ main.js       entry: windows, placement, tray, menus, IPC hub, backdrop capture, hover
│  ├─ i18n.js       language resolution (auto/en/ar), dictionaries → renderers
│  ├─ features.js   every switch and number setting, validated and persisted (features.json)
│  ├─ settings.js   tiny JSON store in %APPDATA%\soqo-island
│  ├─ migrate.js    one-time import of Nova Island data (never modifies the source)
│  ├─ apps.js       Start-menu catalogue (helper `apps`), pins, launch via shell:AppsFolder
│  ├─ shelf.js      files kept by path, timed screenshots
│  ├─ system.js     CPU/RAM, clipboard history (memory only), weather, location
│  ├─ smartclip.js  what a copied text is (link, colour, arithmetic, long text)
│  ├─ prayer.js     prayer-time maths (PrayTimes method), Hijri date (ar + en)
│  ├─ downloads.js  IDM Nova bridge (optional third-party product)
│  ├─ browser-downloads.js  download-folder watcher (partial files)
│  ├─ privacy.js    mic/camera use from the CapabilityAccessManager registry
│  ├─ calendar.js   iCal meetings, join links
│  ├─ network.js    link kind + Windows connectivity probe
│  ├─ mini.js       floating YouTube mini player (loopback server, secret path)
│  ├─ prefs-window.js, updater.js, log.js
├─ preload/         context-bridge APIs: island.js (window.soqo), prefs.js, mini.js
├─ renderer/
│  ├─ island/       index.html, style.css, renderer.js (shell + shared helpers), views/*
│  ├─ prefs/        settings window
│  └─ mini/         mini player page (YouTube iframe API)
├─ shared/          i18n.js (translation core), soqi-state.js (Soqi's mood machine) — UMD,
│                   used by main, renderers and tests; timer-pill.js (pill sizes), hover-policy.js (when
│                   the click-through window takes the mouse)
└─ locales/         en.json, ar.json
helper/             SoqoHelper.cs, Apps.cs, YtUrl.cs, AddressBar.cs, build.cmd → soqo-helper.exe
assets/
├─ soqi/            Soqi sprites + sheet.json (shipped)
├─ fonts/           KFGQPC Hafs Qur'an font + its licence (shipped)
├─ branding/        approved icon and brand-sheet originals (not shipped)
├─ mascot/          approved mascot and expression-sheet originals (not shipped)
├─ ui/              design references (not shipped)
└─ screenshots/     app/ genuine screenshots · promo/ concept illustrations (+ web/ copies)
build/              icon.ico / icon.png / tray.png (derived by scripts/prepare-art.py), installer.nsh
test/               node:test suites; helpers/electron-stub.js lets main modules load under Node
scripts/            check-syntax, i18n-check, prepare-art, dev-setup.cmd
docs/               plan, status, checklist, security audit, art requests, this file, …
.github/            CI workflow (verify + helper + unsigned installer), issue and PR templates
```

## Processes and trust boundaries
- **Main** owns every privileged capability: files, shell, clipboard, registry, the helper
  process, network. It validates every IPC argument (`isStr`/`isInt`/`isObj`) and acts only
  on data it produced itself (e.g. opening a file the shelf listed, a meeting link the
  calendar parsed).
- **Renderers** are sandboxed with context isolation and a strict CSP; they get a small
  function-only API from their preload. The island window is click-through until the cursor
  rests on it (hover intent polled in main).
- **Helper** (`soqo-helper.exe`) runs as a child process speaking JSON lines over stdio: media
  session (SMTC), volume, brightness, fullscreen, foreground window, keyboard layout, Caps
  Lock, clipboard sequence + password-manager privacy flag, idle time, Chromium omnibox via
  UI Automation. One-shot subcommands: `apps` (catalogue), `yturl` (tab URL).

## Data flow
Helper → main (`media` lines, ~2/s) → island (`onMedia`) and the companion/state machine.
Main modules push snapshots over named channels (`stats`, `weather`, `prayer`, `downloads`,
`shelf`, `apps`, `calendar`, `privacy`, `network`, `features`, `i18n`); the island asks for a
snapshot on load (`*-snapshot`/`*-get` handles).

## Soqi
`shared/soqi-state.js` computes the mood: short reactions (download, warning, notification,
excited, happy, curious) over a resting state (sleeping when away, curious when the cursor
lingers or you type, music / listening with media, idle). `views/soqi.js` shows one sprite
beside or above the island depending on the free space, and views call
`window.soqi.react(mood)` on real events. Scenes (`views/scene.js`) turn the island into a
glass porthole with Soqi inside next to a card.

## Localisation
See `LOCALIZATION.md`. The dictionary is handed to each page synchronously at preload time,
so nothing renders in the wrong language; changes broadcast as `i18n` and views re-render.

## Build
`npm run verify` = syntax check + ESLint + `tsc --noEmit` + i18n gate + tests.
`npm run helper:build` compiles the helper with the C# compiler that ships with Windows.
`npm run dist` builds the NSIS installer (Electron fuses applied; see SECURITY_AUDIT.md).
