# Changelog

All notable changes to Soqo Island. The format follows Keep a Changelog; versions follow
semver. Nothing below has been published yet.

## [2.0.0-beta.1] — unreleased

First Soqo Island build, a rebrand and rebuild of Nova Island 1.4.0 (GPL-3.0, by AmerTech).

### Added
- **Soqi the Dolphin**: an original companion with ten moods (idle, happy, excited, curious,
  listening, music, sleeping, notification, download, warning) reacting to real events;
  peeks beside or above the island; appears in the player and in scene cards. Switches for
  showing Soqi, cursor peeks, reactions and movement; honours Windows' reduced-motion setting.
- **Arabic interface** next to English with live switching (Settings › General › Language),
  full right-to-left layouts, Arabic plural rules, Arabic/English Hijri month names.
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
- Arabic and English installer languages.
- Documentation: architecture, localisation, privacy, security policy, releasing, art assets.

### Changed
- Name, icon, tray icon, executable, installer, shortcuts, data folder (`soqo-island`), log
  (`soqo.log`), update channel (this repository). Ocean palette (navy glass, cyan, turquoise).
- Project structure under `src/` (main, preload, renderer, shared, locales) with a
  TypeScript `checkJs` gate, ESLint, i18n parity gate and 43 unit tests (`npm run verify`).
- The native helper is `soqo-helper.exe`, rebuilt from source with a version resource.

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
