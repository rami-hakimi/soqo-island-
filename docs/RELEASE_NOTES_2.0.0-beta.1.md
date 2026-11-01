# Soqo Island 2.0.0-beta.1 — release notes (draft, unpublished)

**A Living Island for Windows.** Soqo Island puts your music, downloads, apps, files and
alerts in one glass capsule at the top of the screen, with Soqi the Dolphin for company.
This is the first public beta of the Soqo Island rebuild, based on the open-source Nova
Island project.

## Highlights
- **Soqi**, an original dolphin companion with ten moods that reacts to what actually
  happens: a finished download, a lost connection, music playing, you coming back.
- **English and Arabic**, switchable live, with full right-to-left layouts.
- **Optional Islamic features** (prayer times, reminders, Qur'an verses) under
  Settings › Features — off by default for new installations, one switch to turn on.
- **Privacy-first**: no accounts, no telemetry; clipboard history in memory only; a switch
  to turn the live glass backdrop (screen capture under the island) off entirely.
- **Hardened**: sandboxed renderers, strict content-security policies, Electron fuses, typed
  IPC validation.
- A redesigned music view, the ocean palette, Windows media integration, mini player,
  download tracking, smart clipboard, privacy dots, shelf, timer and focus sessions.

## Requirements
Windows 10 or 11, 64-bit.

## Install
Download `Soqo-Island-Setup-2.0.0-beta.1.exe`. The build is not code-signed yet, so Windows
SmartScreen may show "Windows protected your PC": choose *More info → Run anyway*. The
installer offers English and Arabic.

## Coming from Nova Island
Your settings are imported once from `%APPDATA%\dynamic-nova`; the old folder is left as it
was. If your prayer features were at their defaults, Soqo Island asks once whether to keep
them.

## Known limitations
- Unsigned build (SmartScreen warning).
- Arabic text awaits native-speaker review.
- The adhan sound is a soft chime.
- Tested on one Windows 11 machine; multi-monitor and high-DPI reports welcome.

## Thanks
Nova Island by AmerTech (GPL-3.0) for the foundation; the King Fahd Glorious Quran Printing
Complex for the Hafs font; Open-Meteo for weather data.

Developed by Rami Al-Hakimi — https://github.com/rami-hakimi
