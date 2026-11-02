# Contributing

Thanks for helping with Soqo Island. The project is GPL-3.0; by contributing you agree that
your changes are released under the same licence. The [Code of Conduct](CODE_OF_CONDUCT.md)
applies in every project space.

## Setting up
```bash
git clone https://github.com/rami-hakimi/soqo-island-.git
cd soqo-island-
npm install            # if node_modules/electron/dist is missing: node node_modules/electron/install.js
npm start              # run the island
npm run verify         # syntax, ESLint, TypeScript checkJs, i18n parity, tests
```
Windows 10/11 is required to run the app (the helper uses Windows APIs); the unit tests run
on any platform. Use `SOQO_USER_DATA=<folder>` to keep a development run's data separate from
an installed copy. `scripts/dev-setup.cmd` registers a source checkout for startup and creates
a desktop shortcut for it (development only).

## Reporting bugs
Open an issue with the **Bug report** template. Include the Soqo Island version (bottom of
the Settings sidebar), the Windows version, the interface language and steps to reproduce.
Settings › Support › *Copy report* gives a log excerpt; remove anything private before
pasting. Security problems are **not** filed as issues: see [`SECURITY.md`](SECURITY.md).

## Suggesting features
Use the **Feature request** template. Describe the situation before the solution. Changes to
default behaviour should come with a switch in Settings; the religious features stay optional
and off by default for new installations.

## Translations
- The dictionaries are `src/locales/en.json` and `src/locales/ar.json`; every key must exist in
  both, and `npm run i18n:check` enforces it.
- Arabic strings were written during the rebuild; a native-speaker review is the most useful
  contribution right now. Record what you checked in `docs/TRANSLATION_REVIEW.md`.
- Adding a language (Dutch is the next candidate) is described in `docs/LOCALIZATION.md`:
  a new `src/locales/<code>.json`, the language option in Settings › General, plural rules,
  and, for right-to-left languages, the `dir` handling that Arabic already uses.
- Qur'an text, du'a and dhikr are never retranslated or edited; the UI around them is.

## Making changes
- Keep features working: nothing is removed without an equivalent. The regression list is
  `docs/REGRESSION_CHECKLIST.md`; update it when a feature changes.
- Every user-facing string goes through the dictionaries; add both English and Arabic.
- Religious source text (`src/renderer/island/views/reminders-data.js`) is protected by a
  checksum test; changes need a reviewed source and an updated hash in the same commit.
- Security-relevant changes (IPC, preloads, CSP, network, helper) need a note in
  `docs/SECURITY_AUDIT.md`.
- Artwork: only original work in the approved style; see `docs/ART_ASSET_REQUESTS.md`.
  Regenerate derived images with `python scripts/prepare-art.py` rather than editing them.
- Commit messages: imperative, one topic per commit.

## Pull requests
Fork, branch from `main`, run `npm run verify`, and fill in the pull request template. CI runs
the same gate, rebuilds the helper from source and builds an unsigned installer; please attach
screenshots for visual changes (both languages when relevant). Maintainers may ask for a
manual check on Windows for behaviour the unit tests cannot cover (hover, click-through,
full screen, startup).
