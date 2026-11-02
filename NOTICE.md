# Notices and attribution

Soqo Island is free software under the GNU General Public License v3.0 (see `LICENSE`).
Copyright © 2026 Rami Al-Hakimi and Soqo Island contributors. Licence texts of the bundled
third-party components are in `THIRD_PARTY_NOTICES.md`.

## Based on Nova Island
Soqo Island is a fork of **Nova Island** (https://github.com/NOVA-TECH-KIT/nova-island),
Copyright © 2026 Nova Island by AmerTech, licensed under GPL-3.0-only. The original authors
asked that modified versions use a different name and logo; "Nova Island", the Nova companion
character and the Nova logo are their marks and are not used by this project.

**Modification notice (GPL-3.0 §5).** This program has been modified from Nova Island 1.4.0
(upstream commit `7e3c4ee`) by Rami Al-Hakimi, November 2026: rebrand, the Soqi companion,
Arabic and Dutch interfaces, optional Islamic features, timer sizes, security hardening, project
structure, and the fixes listed in `CHANGELOG.md`. A large part of the code base, including the
island concept and the media, download, clipboard, shelf and prayer modules, was written by the
upstream authors. This notice is the record of their authorship and stays in place whatever the
shape of the Git history; nothing here claims upstream code as the work of the current
maintainer.

## Third-party components
| Component | Copyright / source | Licence | Where |
|---|---|---|---|
| Electron, Chromium, Node.js and bundled libraries | Various | MIT, BSD and others | `LICENSE.electron.txt`, `LICENSES.chromium.html` next to the installed executable |
| electron-updater and its dependencies (14 packages) | electron-builder authors and others | MIT, ISC, BSD-3-Clause | `THIRD_PARTY_NOTICES.md` (full texts; `lazy-val` publishes no licence file, so its MIT text is reproduced there) |
| node-ical and its dependencies | node-ical contributors and others | Apache-2.0, MIT | `THIRD_PARTY_NOTICES.md` |
| PrayTimes.js calculation core (ported in `src/main/prayer.js`) | Copyright (C) 2007-2011 PrayTimes.org, Hamid Zarrabi-Zadeh | LGPL-3.0, combined under LGPL §4 | header of `prayer.js`, LGPL text in `THIRD_PARTY_NOTICES.md` |
| Open-Meteo weather and geocoding data | Open-Meteo.com | CC BY 4.0; free API for non-commercial use | credit link next to the weather (System tab) and under Settings › Location; this file |
| KFGQPC HAFS Uthmanic Script v3.0 (font) | Copyright (c) 2010 King Fahd Glorious Quran Printing Complex | KFGQPC EULA: use, copy, distribute free of charge; no selling or modification. **Not** covered by the GPL | `assets/fonts/KFGQPC-LICENSE.txt`, included unmodified (same file as upstream) |
| Qur'an verse text (25 short passages) | Tanzil Quran Text (Uthmani, version 1.1), Copyright (C) 2007-2026 Tanzil Project, https://tanzil.net | CC BY 3.0: verbatim copies only, source named, link to tanzil.net, notice kept | `src/renderer/island/views/reminders-data.js` (pinned by a checksum test), `assets/quran/TANZIL-LICENSE.txt`, credit and link under Settings › Features, tooltip on every verse card |
| Contributor Covenant 2.1 | Coraline Ada Ehmke and contributors | CC BY 4.0 | `CODE_OF_CONDUCT.md` |

### Qur'an text: status
Resolved on 2 November 2026. The passages inherited from upstream (KFGQPC text obtained
through the Quran.com API, no explicit licence found) were replaced, word for word, by the
same verses from the Tanzil Project's Uthmani text, which carries an explicit licence. Every
passage was compared letter by letter with the Tanzil download before and after the change
(`docs/QURAN_TEXT_PROPOSAL.md`). The text is shown in the KFGQPC Hafs font, which is a separate
component under its own licence (above).

## Artwork
- **Application screenshots** (`assets/screenshots/app/`) were captured from the running
  application by this project.
- **Derived images** (`build/icon.*`, `build/tray*.png`, `assets/soqi/*.png`) are produced by
  `scripts/prepare-art.py` from the originals below and are reproducible.
- **Originals** (`assets/branding/`, `assets/mascot/`, `assets/ui/`) and the five **concept
  illustrations** (`assets/screenshots/promo/`) are AI-assisted assets supplied by the project
  maintainer (Rami Al-Hakimi) for Soqo Island: created with image-generation tools from the
  maintainer's direction and selected, cropped and prepared by the project. No exclusive
  copyright is claimed beyond what the law of the relevant jurisdiction supports for such
  material; to the extent the maintainer holds rights in them, they may be used under the same
  GPL-3.0 terms as the rest of the repository. The concept illustrations are marketing
  concepts, not screenshots, and are labelled as such wherever they appear. They contain no
  Nova Island artwork; Soqi is not the Nova character. The "Soqo Island" name and the Soqi
  character remain this project's identifiers; please use a different name and mascot for
  modified versions.

## Sounds
Timer, alert and prayer-chime sounds are synthesised at runtime with the Web Audio API; no
third-party audio files are bundled.

## Integrations
The download manager shown as "IDM" in the interface is the upstream author's separate product
(installed as "IDM Nova", bridge on 127.0.0.1:17890). Soqo Island talks to it over that local
bridge when it is installed; the product is not part of this project's branding.
