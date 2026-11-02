<div align="center">

<img src="build/icon.png" alt="Soqo Island icon" width="96" height="96">

# Soqo Island

**A Living Island for Windows**

A floating desktop companion for Windows 10 and 11, with Soqi the Dolphin.

[Features](#key-features) · [Installation](#installation) · [How to use](#how-to-use) · [Documentation](docs/) · [Changelog](CHANGELOG.md)

</div>

## About

Soqo Island is a small glass capsule that floats at the top of your screen, inspired by
Dynamic Island-style interfaces. Collapsed, it shows what matters right now: the song that is
playing, a running timer, a finished download, the next meeting. Rest the pointer on it and it
opens into a panel with music controls, apps, files, downloads and system information; move
away and it folds back without ever taking focus from your work. Soqi, an original dolphin
character, lives beside the island and reacts to what happens on your PC. The interface is
available in English, Arabic (right-to-left) and Dutch.

## Screenshots

The first image is a **promotional concept illustration**; the others are captures of the
running application.

![Concept illustration of the Soqo Island capsule with Soqi and its main features](assets/screenshots/promo/web/01-soqo-overview.jpg)

| | |
|---|---|
| ![Music view with a live media session and Soqi](assets/screenshots/app/music.png) | ![Large running-timer pill on hover with pause and reset](assets/screenshots/app/timer-large-hover.png) |
| Music view | Large timer pill on hover |
| ![Soqi peeking over the collapsed island](assets/screenshots/app/island-soqi.png) | ![Qur'an verse card from the optional reminders](assets/screenshots/app/reminder-ayah.png) |
| Soqi beside the island | Qur'an verse card (optional Islamic Features) |
| ![Settings › Features with the Islamic Features switch](assets/screenshots/app/settings-features.png) | ![Prayer tab in Arabic with right-to-left layout](assets/screenshots/app/prayer-ar.png) |
| Settings › Features | Arabic interface |
| ![Settings › Companion in Dutch with the Soqi switches and the Say hi button](assets/screenshots/app/settings-companion-nl.png) | ![Welcome card in Arabic](assets/screenshots/app/welcome-ar.png) |
| Dutch interface (Settings › Companion) | Welcome card, Arabic |

More concept illustrations: [focus timer](assets/screenshots/promo/web/02-focus-timer.jpg) ·
[Soqi](assets/screenshots/promo/web/03-soqi-companion.jpg) ·
[Islamic features](assets/screenshots/promo/web/04-islamic-features.jpg) ·
[Windows experience](assets/screenshots/promo/web/05-windows-experience.jpg).
They show the intended look and may differ in detail from the application.

## Key features

- **Media controls** for whatever Windows is playing: artwork, title, play/pause/skip, volume
  and brightness, and a floating mini player for YouTube.
- **Timers and focus sessions**, with a running-timer pill in three sizes that can stay
  visible over full-screen apps.
- **Downloads**: browser downloads with progress and speed, plus live control of the IDM
  download manager when installed.
- **Notifications** inside the island for downloads, screenshots, battery, keyboard language,
  Caps Lock, network changes and upcoming meetings from an iCal link.
- **Clipboard tools**: history kept in memory only, and smart actions for copied links,
  colours and sums.
- **Shortcuts and utilities**: a pinned app launcher with Start-menu search, a shelf for files
  you are working with, CPU/RAM, weather, screenshots straight to the shelf.
- **Soqi the Dolphin**: ten moods driven by real events, a playful reaction when you click
  her, gentle idle motion, a bob to the music. Switchable off; follows Windows' reduced-motion
  setting.
- **Customization**: horizontal or vertical, docked or floating, hide in full screen, live or
  static glass, timer size, language.
- **Privacy**: no account, no telemetry; microphone and camera indicators; the live-glass
  screen capture can be turned off entirely. See [docs/PRIVACY.md](docs/PRIVACY.md).
- **Automatic startup**: *Launch at Windows startup* starts the island quietly at sign-in.
- **Languages**: English, Arabic and Dutch, switchable live.
- **Optional Islamic Features**: prayer times calculated on your PC, notifications, dhikr,
  du'a and Qur'an verses. **Disabled by default** for fresh installations; one switch under
  Settings › Features turns them on.

## Installation

Requires Windows 10 or 11, 64-bit. No account is needed.

1. Open the [Releases page](https://github.com/rami-hakimi/soqo-island-/releases). The first
   public beta installer will be published there; until then, build from source (see
   [Built with](#built-with)).
2. Download `Soqo-Island-Setup-<version>.exe` and run it.
3. The installer is not code-signed yet, so Microsoft SmartScreen may warn you. Only continue
   if you downloaded the file from this repository's Releases page: choose *More info*, check
   that the app is Soqo Island, then *Run anyway*.
4. Follow the installer (English, Arabic or Dutch). It installs for the current user, without
   administrator rights, and creates Start-menu and desktop shortcuts.
5. The island appears at the top of your screen. Right-click it or the tray icon and choose
   **Settings…** to pick your language and preferences, and turn on *Launch at Windows
   startup* if you want it there every time you sign in.

Installing a newer version over an existing one keeps your settings. Uninstalling from
Windows Settings › Apps removes the program, its shortcuts and the startup entry.

## How to use

- **Open and close**: rest the pointer on the pill to open the island, move away to close it.
  `Ctrl + Alt + I` pins it open. Drag the pill to move the island; drop it near the top edge to
  dock it.
- **Music**: when something plays, the Music view shows artwork and controls; the scroll wheel
  over the pill changes the volume.
- **Timer**: open the Timer tab, pick a duration or start a focus session. Choose the size of
  the running-timer pill under Settings › Timer; Medium and Large show pause and reset on
  hover.
- **Notifications**: cards appear in the island; the × closes them at once. Each kind can be
  switched off under Settings › Alerts & Privacy.
- **Soqi**: click her for a reaction; adjust or hide her under Settings › Companion.
- **Language**: Settings › General › Language (Automatic, English, العربية, Nederlands).
- **Islamic Features**: Settings › Features › Islamic Features. Nothing related runs while the
  switch is off.
- **Exit**: right-click the island or the tray icon › Quit. Startup can be turned off under
  Settings › General or in Windows Settings › Apps › Startup.

## Built with

- [Electron](https://www.electronjs.org/) 44 and Node.js 22
- JavaScript (CommonJS main process, classic-script renderers) with TypeScript `checkJs`
  type checking, HTML and CSS; no bundler
- A small C# helper (`helper/`) for Windows media sessions, audio, brightness, UI Automation
  and the Start-menu catalogue
- electron-builder (NSIS installer), electron-updater, node-ical
- ESLint, `node:test`, and a GitHub Actions workflow that runs the checks and builds the
  installer

```bash
git clone https://github.com/rami-hakimi/soqo-island-.git
cd soqo-island-
npm install
npm start          # run from source
npm run verify     # syntax, lint, types, translations, tests
npm run dist       # build the installer into dist/
```

Architecture, localisation, privacy, security and release notes are in [`docs/`](docs/).
Contributions are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md).

## Developer

**Developed by Rami al-Hakimi** · [github.com/rami-hakimi](https://github.com/rami-hakimi)

## License

Soqo Island is free software under the [GNU General Public License v3.0](LICENSE).
It is based on the GPL-licensed Nova Island project; upstream authorship, the modification
notice and all third-party licences (including the KFGQPC Hafs Qur'an font, which is not
covered by the GPL) are listed in [NOTICE.md](NOTICE.md).
