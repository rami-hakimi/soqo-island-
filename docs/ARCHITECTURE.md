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
│  ├─ agents.js     coding agents: named-pipe bridge for the hooks, session store, hook-file
│  │                connect / disconnect with backups, "open terminal" via the helper
│  ├─ notifications.js  Windows notifications (helper listener): opt-in list in memory, quiet state
│  ├─ prefs-window.js, focus-window.js (full-screen Focus Mode view), updater.js, log.js
├─ preload/         context-bridge APIs: island.js (window.soqo), prefs.js, mini.js
├─ renderer/
│  ├─ island/       index.html, style.css, renderer.js (shell + shared helpers), views/*
│  ├─ prefs/        settings window
│  └─ mini/         mini player page (YouTube iframe API)
├─ shared/          i18n.js (translation core), soqi-state.js (Soqi's mood machine) — UMD,
│                   used by main, renderers and tests; timer-pill.js (pill sizes), hover-policy.js (when
│                   the click-through window takes the mouse), placement.js (anchor and
│                   window position), visibility.js (when the island is shown, and the
│                   Show / Hide state holder), front.js (desktop vs application in front,
│                   with a settle time; drives the mini timer pill), battery.js (Windows
│                   power status → words), agent-events.js (hook payload → session state,
│                   validation, de-duplication), agent-config.js (the hook entries and how
│                   they are added to / removed from an agent's user-level file)
└─ locales/         en.json, ar.json, nl.json
helper/             SoqoHelper.cs, Apps.cs, YtUrl.cs, AddressBar.cs, Power.cs (battery), Agents.cs
                    (hook relay subcommand, parent-process chain → terminal window, focus),
                    Notifications.cs (Windows notification listener), build.cmd → soqo-helper.exe
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
docs/               architecture, localisation, privacy, security audit, releasing, checklist,
                    releases/ (notes per version), archive/ (migration plan and log)
.github/            ci.yml (verify + helper + unsigned installer), release.yml (tag-gated
                    pre-release), issue and PR templates
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
  UI Automation, battery (every 2 s), and — while the island asked for it — new Windows
  notifications. Commands: media, volume, brightness, `focus <hwnd>` / `focusproc <name>`
  (bring an existing window to the front), `notif on|off`. One-shot subcommands: `apps`
  (catalogue), `yturl` (tab URL), `hook claude|codex` (run by the agent: whitelists the hook
  payload and posts it to the island's named pipe; see `CODING_AGENTS.md`).

## Data flow
Helper → main (`media` lines, ~2/s) → island (`onMedia`) and the companion/state machine.
Main modules push snapshots over named channels (`stats`, `weather`, `prayer`, `downloads`,
`shelf`, `apps`, `calendar`, `privacy`, `network`, `features`, `i18n`, `battery`, `agents`,
`notif`); the island asks for a snapshot on load (`*-snapshot`/`*-get` handles). Coding-agent
hooks reach main over `\\.\pipe\soqo-island-agents-<hash>` (token in
`agents-bridge.json`), one bounded JSON line per connection.

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
