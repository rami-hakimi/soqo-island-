# Security policy

## Reporting a vulnerability
Please report security issues privately through GitHub's "Report a vulnerability" form on
this repository (Security › Advisories) rather than a public issue. Include the version
(Settings › sidebar), Windows version, and steps to reproduce. You will get an acknowledgement
within a few days; fixes ship as a new release with credit if you want it.

## Scope
- The Electron application (`src/`), the native helper (`helper/`), the installer and the
  update mechanism.
- Out of scope: the IDM download manager (a separate product), third-party services the app queries, issues
  requiring a compromised Windows account.

## Design summary
- All renderers: sandbox + context isolation, strict CSP, no Node access, function-only
  preload APIs; navigation and new windows blocked; `https:` links only ever open in the
  default browser.
- Main validates every IPC argument and acts only on data it produced itself.
- Electron fuses in release builds: RunAsNode off, NODE_OPTIONS off, Node CLI inspect off,
  ASAR integrity on, only-load-from-ASAR on.
- The native helper is compiled from the sources in `helper/` with Windows' own C# compiler;
  CI rebuilds it so the committed binary can be compared.
- No telemetry; see `docs/PRIVACY.md`. Full findings and status: `docs/SECURITY_AUDIT.md`.

## Known limitations
- Builds are not code-signed yet; SmartScreen will warn on first run. Updates are protected
  by electron-updater's SHA-512 check of `latest.yml` and GitHub account security.
- The shelf accepts any existing file path a renderer hands it (by design: files you drop);
  a hardened drop handshake is tracked as SEC-7.
