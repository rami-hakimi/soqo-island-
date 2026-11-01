# Notices and attribution

Soqo Island is free software under the GNU General Public License v3.0 (see `LICENSE`).

## Based on Nova Island
Soqo Island is a fork of **Nova Island** (https://github.com/NOVA-TECH-KIT/nova-island),
Copyright © 2026 Nova Island by AmerTech, licensed under GPL-3.0-only. The original
authors asked that modified versions use a different name and logo; "Nova Island", the
Nova companion character and the Nova logo are their marks and are not used by this project.
The upstream Git history is preserved in this repository.

## Third-party components
| Component | Licence | Use |
|---|---|---|
| Electron | MIT | Application runtime |
| electron-updater (electron-builder) | MIT | Update checks and installs |
| node-ical | Apache-2.0 | iCal parsing for meeting reminders |
| PrayTimes.org calculation method | LGPL-3.0 (algorithm reference; reimplemented in `prayer.js`) | Prayer-time maths |
| Open-Meteo | CC BY 4.0 (data) | Weather and city search |
| KFGQPC HAFS Uthmanic Script v3.0 | King Fahd Glorious Quran Printing Complex EULA (`fonts/KFGQPC-LICENSE.txt`) | Qur'an text rendering. Included unmodified; **not** covered by the GPL |
| Qur'an text | Quran.com API (`text_qpc_hafs`), KFGQPC script | `views/reminders-data.js`, unchanged from upstream |

## Integrations
"IDM Nova" is a separate download manager by the upstream author. Soqo Island talks to it
over its local bridge when it is installed; the name refers to that product and is not part
of this project's branding.
