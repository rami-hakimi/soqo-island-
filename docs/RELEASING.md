# Releasing

Nothing is published from ordinary pushes. A release is a deliberate step: a version tag (or
a manual run of the Release workflow naming an existing tag) that the maintainer creates.

## Workflows
- **CI** (`.github/workflows/ci.yml`): pushes to `main` and to `rebuild/**`, `feature/**`,
  `fix/**`, `release/**`, every pull request against `main`, and manual runs. Windows runner,
  `npm ci` from the lockfile, `npm run verify` (syntax, ESLint, TypeScript `checkJs`,
  English/Arabic/Dutch parity, unit tests), helper rebuilt from source and exercised,
  `npm audit --omit=dev --audit-level=high`, unsigned installer, `scripts/release-check.js`,
  installer uploaded as a 14-day artifact. Read-only token; actions pinned to commit SHAs.
- **Release** (`.github/workflows/release.yml`): tags `v*` or a manual run with a tag. The
  `build` job (read-only) checks that the tag equals `package.json` `version`, runs the same
  gate, builds the installer, validates it and writes `SHA256SUMS.txt`. The `publish` job is
  the only one with `contents: write`; it runs in the `release` environment (add required
  reviewers there for a manual approval step), refuses to touch an existing release, and
  creates a GitHub **pre-release** for tags containing `-` (beta, rc) with the installer, its
  `.blockmap`, `latest.yml`, `SHA256SUMS.txt` and `docs/releases/<version>.md` as notes.

## Before tagging
1. `npm run verify` green on a clean checkout.
2. `version` in `package.json` and `package-lock.json` bumped (semver; pre-releases as
   `2.0.0-beta.2`), `CHANGELOG.md` updated, `docs/releases/<version>.md` written.
3. `python scripts/prepare-art.py` if artwork changed; `npm run helper:build` if `helper/*.cs`
   changed (commit the rebuilt `soqo-helper.exe`).
4. Local dry run: `npm run dist -- --publish never && node scripts/release-check.js --tag v<version>`.
5. Walk `docs/REGRESSION_CHECKLIST.md` on a real Windows desktop for anything the unit tests
   cannot cover.

## Publish
```bash
git checkout main && git pull
git tag -a v2.0.0-beta.2 -m "Soqo Island 2.0.0-beta.2"
git push origin v2.0.0-beta.2
```
or: GitHub → Actions → Release → *Run workflow* → tag `v2.0.0-beta.2`. Then check the
Release run, open the pre-release and download the installer once to confirm the files. The
updater reads `latest.yml` from the latest (pre-)release; from a machine with the previous
version installed, the island should offer the update within a minute of start when
*Auto-update* is on.

## Signing
The installer is **unsigned**; SmartScreen warns on first run. To sign, provide a certificate
or an Azure Trusted Signing configuration to electron-builder through repository secrets
(`CSC_LINK` / `CSC_KEY_PASSWORD`, or the Azure settings) and remove
`CSC_IDENTITY_AUTO_DISCOVERY: 'false'` from the workflows. Never commit certificates.

## Rollback
Un-publish or delete the faulty release's `latest.yml`; the updater then offers the previous
release again. Users already updated can reinstall the older setup file. Never move or reuse
a tag; publish a new patch version instead.
