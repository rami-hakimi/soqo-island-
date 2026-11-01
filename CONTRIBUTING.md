# Contributing

Thanks for helping with Soqo Island. The project is GPL-3.0; by contributing you agree that
your changes are released under the same licence.

## Setting up
```bash
git clone https://github.com/rami-hakimi/soqo-island-.git
cd soqo-island-
npm install            # if node_modules/electron/dist is missing: node node_modules/electron/install.js
npm start              # run the island
npm run verify         # syntax, ESLint, TypeScript checkJs, i18n parity, tests
```
Windows 10/11 is required to run the app (the helper uses Windows APIs); the unit tests run
on any platform. Use `SOQO_USER_DATA=<folder>` to keep a development run's data separate.

## Making changes
- Keep features working: nothing is removed without an equivalent. The regression list is
  `docs/REGRESSION_CHECKLIST.md`.
- Every user-facing string goes through the dictionaries (`docs/LOCALIZATION.md`); add both
  English and Arabic. `npm run i18n:check` enforces parity.
- Religious source text (`src/renderer/island/views/reminders-data.js`) is protected by a
  checksum test; changes need a reviewed source and an updated hash in the same commit.
- Security-relevant changes (IPC, preloads, CSP, network, helper) need a note in
  `docs/SECURITY_AUDIT.md`.
- Artwork: only original work in the approved style; see `docs/ART_ASSET_REQUESTS.md`.
- Commit messages: imperative, one topic per commit.

## Pull requests
Open them against `main`. CI runs verify, rebuilds the helper and builds an unsigned
installer; please attach screenshots for visual changes (both languages when relevant).

## Reporting issues
Use GitHub Issues for bugs and ideas. For security problems, see `SECURITY.md`.

## Translations
Arabic review and new languages are welcome; follow `docs/LOCALIZATION.md` and keep
`docs/TRANSLATION_REVIEW.md` up to date.
