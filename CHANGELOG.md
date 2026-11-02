# Changelog

All notable changes to Soqo Island. The format follows Keep a Changelog; versions follow
semver.

## [2.0.0-beta.6] — unreleased

Scrolling fix after the owner's beta.5 test.

### Fixed
- **Content below the island's edge could not be reached.** A panel's grid row grew to its
  tallest card instead of being bounded by the view (162 px inside the 548 × 232 island), so
  with Brightness and Battery present the System meters card was 229 px tall, the Battery row
  sat below the island's bottom edge, and a clipboard list with many entries grew with the
  card instead of scrolling; the mouse wheel over those areas changed the volume instead. Now
  every panel grid is bounded (`grid-template-rows: minmax(0, 1fr)`), the overflowing content
  scrolls inside its card (System meters, clipboard, Activity lists, pinned apps, app search,
  downloads, prayer list: `.scroll`), the wheel scrolls these regions, a drag on them or their
  scrollbar never moves the island, and a click on a region's surface gives it keyboard focus
  so the arrow keys and Page Up / Down scroll it (Escape or closing the island gives focus
  back). Regression test: `test/scroll-layout.test.js`.

### Changed
- Clipboard history keeps 20 entries (was 8), still in memory only.

## [2.0.0-beta.5] — unreleased

Battery, weather credit, coding agents, Activity tab, Windows notifications.

### Added
- **Battery** under Brightness in the System tab: percentage, charging / plugged in / on
  battery / fully charged, low and critical states, time left when Windows reports it; read
  from `GetSystemPowerStatus` through the helper every 2 s (`helper/Power.cs`,
  `shared/battery.js`); the row is omitted on PCs without a battery and an unknown reading is
  shown as unknown. The battery toasts now come from the same source.
- **Coding Agents** (opt-in, Settings › Connections): Claude Code and Codex CLI sessions on the
  new **Activity** tab — started, working (with the current tool), idle, finished, failed,
  **needs your approval** (prominent toast with a safe one-line summary of the request, agent,
  project and time; optional island expansion; optional banner in Focus Mode) — and a jump
  back to the terminal window the session runs in. Connect edits the agent's user-level hook
  file after a confirmation dialog, with a backup next to it; Disconnect removes exactly Soqo
  Island's entries. Hooks talk to the island over a token-checked local named pipe; prompts,
  replies and transcripts never leave the hook; approvals are always given in the terminal.
  `src/main/agents.js`, `shared/agent-events.js`, `shared/agent-config.js`, `helper/Agents.cs`,
  `docs/CODING_AGENTS.md`.
- **Activity tab**: coding-agent sessions (most important first) and recent notifications.
- **Windows notifications on the island** (opt-in): the toasts Windows keeps in its
  notification centre — Chrome web notifications such as WhatsApp Web included — through
  Windows' official notification listener, polled by the helper (`helper/Notifications.cs`,
  `src/main/notifications.js`). Windows' permission is requested and shown, previews can be
  switched off, nothing is stored, Windows' do-not-disturb state is respected, dismissed
  notifications disappear here too. Works on Windows 11 for the unpackaged build; findings and
  the package-identity fallback in `docs/WINDOWS_NOTIFICATIONS.md`.
- `docs/FUTURE_ROADMAP.md`: completed integrations versus deferred work.

### Changed
- **Weather card credit**: the large underlined "Weather data by Open-Meteo.com" button became
  a small "Weather by Open-Meteo" link plus an ⓘ information control that opens an accessible
  popover with the provider, the CC BY 4.0 licence, the licence details and the GeoNames
  city-search credit. Open-Meteo's licence requires a link next to the data, so the small
  link stays visible. The popover lives inside the island and closes on Escape (focus returns
  to ⓘ), on a click elsewhere, on blur and when the island collapses. Credits in Settings and
  the legal files are unchanged.
- Helper build gains `Power.cs`, `Agents.cs`, `Notifications.cs` and references
  `System.Web.Extensions`, `Windows.UI.winmd`, `Windows.ApplicationModel.winmd`.

### Tests
- New: `battery`, `agent-events` (parsing, validation, hostile payloads, several sessions,
  duplicates, pruning), `agent-config` (connect / disconnect / idempotence / formatting),
  `agents-bridge` (token over the real pipe, refused dialog, backups, broken files),
  `notifications` (opt-in, permission, previews, duplicates, gone, quiet, open restricted),
  `weather-attribution`.

## [2.0.0-beta.4] — unreleased

Timer and visibility update after the owner's beta.3 testing.

### Fixed
- **A hidden island can always be brought back.** Launching Soqo Island while it already runs
  reveals the island (the single-instance guard used to quit the second copy silently), the
  island and tray menus offer **Hide island** / **Show island** by state instead of a checkbox,
  a double-click on the tray icon reveals the island, and a second launch under a full-screen
  or maximized rule explains itself in a tray notification. The user's Hide is never
  persisted: every start shows the island. Regression tests: `test/visibility.test.js`
  (hide → restore, tray Show, second launch, quit/restart, Focus Mode and maximized rules).
- Focus Mode in front and the maximized-window rule are transient: the island returns as soon
  as the view closes or loses the front, or the window in front changes.

### Added
- **Adaptive timer pill** (`src/shared/front.js`, `shared/timer-pill.js`): the Settings size
  is the desktop size; over an application window a running timer shrinks to the 168 × 28
  mini pill at the same anchor and grows back on the desktop. The helper reports whether the
  desktop / taskbar is in front; changes settle for 220 ms so Alt+Tab never flickers; the
  explicit full-screen / maximized rules and the timer opt-in keep precedence.
- **Focus Mode** (`src/main/focus-window.js`, `src/renderer/focus/`): a full-screen countdown
  on the island's display with Pause / Resume, Exit (Esc) and Cancel, presets and a
  focus-session start when nothing runs, mirrored from the island's timer (single source of
  truth) through `timer-sync` / `timer-cmd`. Opened from the Timer tab or the menus only.
- Settings › Timer explains Focus Mode and the desktop-size rule; new strings in en / ar / nl.

### Changed
- Large running-timer pill: 400 × 88 with 64 px digits and 44 px controls (was 324 × 66 /
  48 px); Small and Medium unchanged.

## [2.0.0-beta.3] — 2026-11-02

Fixes from the first days of the public beta.

### Fixed
- **The island no longer moves into browser windows by itself.** The "browser address bar"
  slot, which placed the island inside whichever Chromium window was in front (so it could end
  up in the middle of the screen when that window was not maximized), is now opt-in under
  Settings › General and was switched off once for existing installations. The island stays
  at the top centre of its display, or wherever you dragged it, and that place is restored on
  every start; when the slot is on, it is skipped whenever the address bar is not fully on
  screen, and the detection no longer mistakes a text field on a web page for the address bar.
- Placement and visibility rules moved to small pure modules with unit tests (`placement`,
  `visibility`): anchors off the display, second monitors, vertical islands, maximized and
  full-screen apps, the timer opt-in.

### Added
- Settings › General › **Hide while an app is maximized** (off by default), next to "Hide in
  full screen". The running-timer opt-in keeps the timer visible in both cases; the timer
  keeps counting while the island is hidden.
- Settings › **Legal notices**: the GPL-3.0 licence, the notices and credits, and the
  third-party licences shipped inside the application, readable without leaving it. The old
  Credits button, which opened an external repository, is gone.

### Changed
- Larger running-timer pill in all three sizes: Small 300 × 38 with 17 px digits (was 300 × 32,
  13.5 px), Medium 260 × 50 with 28 px digits (was 250 × 44, 24 px), Large 324 × 66 with 48 px
  digits (was 310 × 60, 44 px); bigger pause/reset targets. Colours unchanged.
- Developer name shown as Rami Al-Hakimi.

## [2.0.0-beta.2] — 2026-11-02

First public beta of Soqo Island, a rebrand and rebuild of Nova Island 1.4.0 (GPL-3.0, by
AmerTech). beta.1 was an internal build and was never published.

### Added
- **Soqi the Dolphin**: an original companion with ten moods (idle, happy, excited, curious,
  listening, music, sleeping, notification, download, warning) reacting to real events;
  peeks beside or above the island; appears in the player and in scene cards. Switches for
  showing Soqi, cursor peeks, reactions, movement and clicks; honours Windows' reduced-motion
  setting.
- **Soqi is interactive**: a click (or Enter/Space, or Settings › Companion › *Say hi to
  Soqi*) gets a short swim and a happy or excited face, then she returns to what she was
  doing. At rest she floats gently, blinks now and then and glances around; she sways to
  music and shows up beside the small island during music and timers. Resting the pointer on
  Soqi makes her clickable without opening the island.
- **Arabic interface** next to English with live switching (Settings › General › Language),
  full right-to-left layouts, Arabic plural rules, Arabic/English Hijri month names.
- **Dutch interface** (Nederlands): all 473 strings, Netherlands date and time formats,
  automatic selection on Dutch Windows, Dutch installer language.
- **Optional Islamic Features** with a master switch under Settings › Features, **off for new
  installations**: prayer times, notifications, adhan sound, Islamic scenes, calculation
  method (20 authorities), dhikr / du'a / Qur'an reminders. Nothing prayer-related runs while
  the switch is off.
- Neutral first-run welcome card.
- Settings › Privacy: **Live glass backdrop** switch (off = no screen capture at all).
- One-time import of Nova Island settings from `%APPDATA%\dynamic-nova` (the old folder is
  never modified); an imported profile with the prayer features at their defaults asks once
  whether to keep them.
- Redesigned music view: artwork with reflection, waveform, centred transport, Soqi.
- Running-timer pill in three sizes (Small / Medium / Large) with inline pause and reset on
  hover, and a switch to keep a running timer visible over full-screen apps.
- *Launch at Windows startup* survives upgrades and reinstalls; the uninstaller removes it.
- GitHub community files: issue and pull-request templates, Code of Conduct.
- CI on Windows for every push and pull request (verify gate, helper rebuild, production
  dependency audit, unsigned installer as artifact; actions pinned to commit SHAs) and a
  separate tag-gated Release workflow that validates the installer, update metadata and
  packaged licence files, writes SHA-256 sums and publishes a GitHub pre-release.
- Arabic and English installer languages.
- Documentation: architecture, localisation, privacy, security policy, releasing, art assets.

### Changed
- Name, icon, tray icon, executable, installer, shortcuts, data folder (`soqo-island`), log
  (`soqo.log`), update channel (this repository). Ocean palette (navy glass, cyan, turquoise).
- Project structure under `src/` (main, preload, renderer, shared, locales) with a
  TypeScript `checkJs` gate, ESLint, i18n parity gate and 43 unit tests (`npm run verify`).
- The native helper is `soqo-helper.exe`, rebuilt from source with a version resource.
- Repository layout: artwork under `assets/branding`, `assets/mascot`, `assets/ui`;
  genuine screenshots under `assets/screenshots/app`, promotional concept illustrations
  under `assets/screenshots/promo`; the development setup script moved to `scripts/`.
- "IDM Nova downloads" reads "IDM downloads" (stale persisted labels migrate automatically).

### Fixed
- Qur'an passages now come from the Tanzil Project's Uthmani text (CC BY 3.0, copied
  unchanged, notice shipped, source and link in Settings › Features and on every verse card)
  instead of text with no explicit licence; all 25 passages were verified letter by letter
  against the official download.
- Open-Meteo is credited with a link next to the weather (System tab, Settings › Location),
  as its CC BY 4.0 licence asks; the prayer-time core is attributed to PrayTimes.js (LGPL-3.0)
  in the code and in the notices; `THIRD_PARTY_NOTICES.md` ships the licence texts of every
  bundled package (one of them, `lazy-val`, publishes none in its npm package).
- Live glass: no screen capture while the screen is locked; while a screen recorder (NVIDIA
  Share, OBS, Streamlabs) is running the glass pauses on the static pane and the island stops
  asking Windows to hide it from captures, so NVIDIA Instant Replay keeps working.
- Start-menu scan: a helper that cannot start reports the error instead of hanging the scan.
- Qur'an, du'a, dhikr and scene cards close on the **first** click of their × and hand the
  mouse back at once: cards and scenes take the pointer without the hover-intent delay,
  the cursor poll runs faster while one is open, the live-glass capture pauses meanwhile
  (it used to starve the poll), and a press on a card's header can no longer start a drag.
  After closing, the island stays click-through over the card's area until the pointer
  leaves, so it never pops open under the cursor or blocks the window underneath.
- First Start-menu scan sometimes came back empty: the helper's output was read on `exit`
  before stdout had drained; both spawn sites now wait for `close`.
- Startup registration was lost when an installer re-ran over an existing copy.

### Security
- All renderers sandboxed with strict CSP; Electron fuses (RunAsNode off, NODE_OPTIONS off,
  inspect args off, ASAR integrity on); deny-all permission handlers; typed IPC guards; the
  mini player's loopback server behind a random path. See `docs/SECURITY_AUDIT.md`.

### Removed
- Upstream's Nova logo, character artwork and promotional images; the upstream author's
  donation links (attribution kept in `NOTICE.md` and Settings › About).

### Known limitations
- Builds are not code-signed (SmartScreen warning on first run).
- Arabic strings await a native-speaker review (`docs/TRANSLATION_REVIEW.md`).
- The "adhan sound" is a soft chime, not a recorded adhan.
- The IDM download-manager bridge is kept as an optional third-party integration.
- Dutch and Arabic strings await a second native-speaker review.
- Soqi's blink is a short squash of the still picture, not a drawn eyelid frame.
