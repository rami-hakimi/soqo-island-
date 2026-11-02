# Changelog

All notable changes to Soqo Island. The format follows Keep a Changelog; versions follow
semver. Nothing below has been published yet.

## [2.0.0-beta.2] — unreleased

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
