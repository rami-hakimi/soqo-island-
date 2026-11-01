<div align="center">

# Soqo Island · سوكو آيلاند

**A Living Island for Windows.**

Your music, apps, files and alerts in one glass capsule at the top of your screen, with
**Soqi the Dolphin** keeping you company.

Free and open source (GPL-3.0) · Windows 10/11 (64-bit) · English and Arabic

</div>

> **Status: rebuild in progress.** Soqo Island is a fork of
> [Nova Island](https://github.com/NOVA-TECH-KIT/nova-island) being migrated, modernised and
> rebranded on the `rebuild/soqo-island` branch. No release has been published yet. See
> [`docs/MIGRATION_STATUS.md`](docs/MIGRATION_STATUS.md) for what works today.

## Features

- **Soqi** — an animated dolphin companion who lives in the island: watches the cursor,
  welcomes you back, greets the day, celebrates finished downloads, and reminds you to drink
  water and rest your eyes.
- **Music** — title, artwork and live equaliser for whatever Windows is playing (Spotify,
  YouTube, any player), transport controls, system volume and brightness, and a floating mini
  player for YouTube tabs.
- **Prayer times** — calculated on your PC (no account, no tracking) with the method your
  country uses, Hijri date, a heads-up before the adhan, Ramadan imsak/iftar countdown, and
  dhikr, du'a and Qur'an verses in the KFGQPC Hafs script.
- **Downloads** — browser downloads at a glance (progress, speed, done), plus live control of
  IDM Nova when it is installed.
- **Apps & Shelf** — a pinned app launcher, and a shelf to park files you are working with.
- **Smart clipboard** — copy a link, a sum or a colour and the island offers the one useful
  action. Clipboard history stays in memory only.
- **Privacy dots** — know when an app turns on your microphone or camera.
- **Meetings** — upcoming events from a private iCal link with a one-click Join.
- **Timer & focus sessions**, weather, CPU/RAM, battery, keyboard-language and Caps Lock
  toasts, network status, screenshots to the shelf.
- **Your island, your way** — horizontal or vertical, docked or floating, hides in full
  screen, sits inside the browser's address bar, starts with Windows. Every feature has a
  switch.

## Install

Releases will appear on the [Releases page](../../releases) once the rebuild reaches its
first tagged build. Until then, build from source:

```bash
npm install
npm start          # run it
npm run verify     # syntax check, lint and unit tests
npm run dist       # build the installer into dist/
```

The native helper (`helper/soqo-helper.exe`) is built from `helper/*.cs` with the C# compiler
that ships with Windows: `npm run helper:build`.

Press **Ctrl + Alt + I** to open the island. Right-click it (or the tray icon) for the menu.

## Documentation

- [`docs/MIGRATION_PLAN.md`](docs/MIGRATION_PLAN.md) — feature inventory, architecture and
  the stage plan
- [`docs/MIGRATION_STATUS.md`](docs/MIGRATION_STATUS.md) — what has been done and verified
- [`docs/REGRESSION_CHECKLIST.md`](docs/REGRESSION_CHECKLIST.md) — feature-by-feature checks
- [`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md) — security findings and their status
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — processes, modules, trust boundaries
- [`docs/LOCALIZATION.md`](docs/LOCALIZATION.md) — English / Arabic, RTL, adding a language
- [`docs/PRIVACY.md`](docs/PRIVACY.md) — what is read, stored and sent (nothing is tracked)
- [`docs/RELEASING.md`](docs/RELEASING.md) — build, sign, publish (owner-approved only)
- [`SECURITY.md`](SECURITY.md) — reporting vulnerabilities
- [`NOTICE.md`](NOTICE.md) — attribution and third-party licences

## Coming from Nova Island

Soqo Island keeps its data in `%APPDATA%\soqo-island`. On its first start it copies the
settings of a Nova Island installation (`%APPDATA%\dynamic-nova`) — position, feature
switches, pinned apps, shelf, location, calendar link — and leaves that folder untouched.

## License

Soqo Island is free software, licensed under the
[GNU General Public License v3.0](LICENSE).

Copyright © 2026 Soqo Island contributors.
Based on Nova Island, Copyright © 2026 Nova Island by AmerTech, GPL-3.0. "Nova Island", the
Nova character and the Nova logo belong to the upstream project and are not used here.

The Qur'an font in `assets/fonts/` (KFGQPC HAFS Uthmanic Script by the King Fahd Glorious Quran
Printing Complex) is included unmodified under its own licence, see
[assets/fonts/KFGQPC-LICENSE.txt](assets/fonts/KFGQPC-LICENSE.txt). It is not covered by the GPL.

The name "Soqo Island" and the Soqi character are the marks of this project; please use a
different name and mascot for modified versions.

---

<div dir="rtl" align="right">

## سوكو آيلاند

جزيرة حيّة على سطح مكتب ويندوز: الموسيقى والتطبيقات والملفات والتنبيهات في كبسولة زجاجية
واحدة أعلى الشاشة، ومعك **سوقي الدلفين**. مواقيت الصلاة تُحسب على جهازك دون حساب أو تتبّع،
مع التاريخ الهجري والأذكار والأدعية وآيات من القرآن بخط مجمع الملك فهد (حفص).

البرنامج مجاني ومفتوح المصدر برخصة GPL-3.0، ويعمل على ويندوز 10 و11 (64 بت). الواجهة
بالعربية والإنجليزية قيد الإنجاز ضمن خطة الترحيل.

</div>
