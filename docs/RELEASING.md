# Releasing

Nothing is published automatically. A release is a deliberate, owner-approved step.

## Before a release
1. `npm run verify` green on a clean checkout; `npm run helper:build` reproduces
   `helper/soqo-helper.exe` (commit it if the sources changed).
2. `python scripts/prepare-art.py` if any artwork changed (inputs under `assets/branding` and
   `assets/mascot`).
3. Walk `docs/REGRESSION_CHECKLIST.md` on a real Windows desktop (media controls, mini
   player, address-bar slot, multi-monitor, Arabic + RTL).
4. Bump `version` in `package.json` (semver; pre-releases as `2.0.0-beta.1`), update
   `docs/MIGRATION_STATUS.md` / a CHANGELOG entry, commit.

## Build
```bash
npm run dist            # dist/Soqo-Island-Setup-<version>.exe + latest.yml + blockmap
npm run dist:portable   # dist/Soqo Island <version> portable.exe
```
The build applies the Electron fuses from `package.json` → `build.electronFuses`. Without a
code-signing certificate the installer is unsigned (SmartScreen warning on first run). To
sign, set `CSC_LINK` / `CSC_KEY_PASSWORD` (or Azure Trusted Signing settings) in the
environment of the build; never commit certificates.

## Publish (owner only)
1. Tag: `git tag v<version> && git push origin v<version>` (push requires authorisation).
2. Create the GitHub release on `rami-hakimi/soqo-island-` and upload **all** files from
   `dist/` that electron-builder produced for the target: the setup `.exe`, its `.blockmap`
   and `latest.yml`. The updater reads `latest.yml` from the latest release.
3. Verify from a machine with the previous version installed that the island offers the
   update within ~1 minute of start (Auto-update on).

## CI
`.github/workflows/windows.yml` runs verify, rebuilds the helper, and builds the installer
on every push and pull request, uploading `dist/` as a workflow artifact for inspection. It
does not publish. Publishing from CI would need a `GH_TOKEN` with release rights and the
owner's explicit go-ahead.

## Rollback
Delete or un-publish the faulty release's `latest.yml`; the updater then offers the previous
latest release again. Users already updated can reinstall the older setup file.
