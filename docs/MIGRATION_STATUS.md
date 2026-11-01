# Migration Status

Branch: `rebuild/soqo-island` (from upstream `main` 7e3c4ee, Nova Island 1.4.0).
Remotes: `origin` → github.com/rami-hakimi/soqo-island- (empty, nothing pushed yet),
`upstream` → github.com/NOVA-TECH-KIT/nova-island (push disabled).

Legend for checks: **ran** = executed on this Windows 11 machine with the output recorded;
**not run** = needs a condition this session did not have.

---

## Stage 0 — Import (2026-11-01) ✅
- Local folder was empty; source cloned with full history (8 commits, tags v1.2.0–v1.4.0).
- Remotes renamed/added as above; `git remote set-url --push upstream no_push`.
- Baseline toolchain: Node 24.12, npm 11.6, Electron 44.7.2 (`npm ci` → 293 packages),
  Windows csc (.NET 4) present.
- Helper binary provenance checked: `helper/nova-helper.exe` and `helper/*.cs` come from the
  same commit (ac63452); a rebuild from source in a scratch folder produced an identical-size
  binary (30,208 B; hash differs only by PE timestamp) and its `apps` subcommand returned 183
  Start-menu entries. The binary is unsigned and has no version resource (SECURITY_AUDIT SEC-3).
- No existing `%APPDATA%\dynamic-nova` folder on this machine, so dev runs cannot disturb a
  real installation.

## Stage 1 — Audit, tests, lint (2026-11-01) ✅
**Changes**
- `docs/MIGRATION_PLAN.md`: architecture, 60-row feature inventory with files and tests,
  target structure, stages, rebrand rules, legal checklist, owner decisions.
- `docs/SECURITY_AUDIT.md`: 16 findings with planned fixes; privacy data map.
- `docs/REGRESSION_CHECKLIST.md`: per-feature verification table.
- Test harness: `test/helpers/electron-stub.js` + `setup.js` (routes `require('electron')`
  to a stub with temp data folders) so main-process modules run under `node:test`.
- 26 unit tests across smart clipboard, prayer maths (characterisation values for Cairo,
  Makkah incl. Ramadan rule, London), feature validation, privacy registry parser, iCal
  occurrences/join links, network link detection, browser-download folder watcher (temp
  dir simulation), log rotation/report, religious text checksum + font licence presence.
- ESLint 9 flat config (`eslint.config.js`) with the island's shared renderer globals
  declared; `scripts/check-syntax.js`; `.editorconfig`, `.gitattributes` (exe/ttf/png
  binary, cmd CRLF).
- Source changes (behaviour-neutral): `network.js` exports `linkKind` for tests; three
  regexes that contained a literal U+FEFF now spell it `﻿`.
- `package.json` scripts: `check`, `lint`, `test`, `verify`, `helper:build`.

**Checks ran**
- `npm run check` → 47/47 scripts parse.
- `npm run lint` → 0 problems.
- `npm test` → 26 passed, 0 failed (3.9 s).

**Not run**
- Electron launch: deferred to Stage 2, which adds the `SOQO_USER_DATA` override so a dev
  launch uses an isolated folder.
- Everything marked Manual (Win) in the checklist.

**Features status**: no runtime behaviour changed; all features as imported.

**Risks / open**
- Prayer tests are characterisation values from the imported algorithm, not an external
  reference; an owner comparison against a trusted timetable for their city is recommended.
- Owner decisions listed in MIGRATION_PLAN §8 (support links, signing, IDM Nova, telemetry).

## Stage 2 — Branding & data migration — in progress
See the next entry once committed.
