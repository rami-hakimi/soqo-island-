# Security & Privacy Audit — Soqo Island (from Nova Island 1.4.0)

Date: 2026-11-01. Scope: everything in the repository at import (`upstream/main` 7e3c4ee).
Severity: **High** (exploitable or privacy-breaking), **Medium** (defence in depth missing),
**Low** (hygiene). Status is tracked per item; fixes land in Stage 4 unless noted.

## What upstream already does well
- `contextIsolation: true`, `nodeIntegration: false` on every window; preloads expose a
  narrow, function-only API via `contextBridge`.
- Navigation locked: `setWindowOpenHandler` denies, `will-navigate` blocked, only `https:`
  links go to `shell.openExternal`.
- CSP on all three pages; settings page has no `unsafe-inline`.
- IPC payloads are validated in main where they matter: media commands match a strict regex;
  `shell.openPath` only on paths the app itself listed (shelf, downloads); `open-meeting` only
  on links the calendar parser produced and that match the Meet/Teams/Zoom/Webex pattern;
  smart-clipboard actions use what main classified, never renderer data; app launch only for
  catalogue ids; support links by key.
- Arithmetic in smart clipboard uses a hand-written parser, never `eval`.
- Clipboard history is memory-only, skips password-manager "private" copies, and the image is
  read only when the Windows sequence number changes.
- No Wi-Fi SSID reading (location-sensitive on Win 11), no PowerShell, compiled helper.
- Log never contains clipboard text, calendar URL or file contents; 1 MB rotation.
- iCal URL stored only on disk in the data folder; weather uses coordinates only.

## Findings

| ID | Sev | Finding | Fix |
|---|---|---|---|
| SEC-1 | Medium | Island window and mini player run **without `sandbox: true`** (settings window has it). A renderer compromise (e.g. a malicious media title rendered… all text is `textContent`/escaped, but defence in depth) would have a non-sandboxed process. | Enable `sandbox: true` on both; `webUtils.getPathForFile` works in sandboxed preloads on Electron ≥ 32. Verify shelf drop still works. |
| SEC-2 | Medium | Island CSP allows `style-src 'unsafe-inline'`. Needed today for inline `style` attributes set by JS (`style.cssText`, custom properties). `script-src` is implicitly `'self'` via `default-src`, which is fine. | Keep for now (CSS custom properties via `style.setProperty` do not need unsafe-inline; `cssText` on sparks does). Replace `cssText` writes with property sets and drop `unsafe-inline`. |
| SEC-3 | Medium | **Committed native binary** `helper/nova-helper.exe` with no signature and no version resource; reviewers cannot prove it matches the sources. | Build the helper in CI from source; add a `helper:build` script and a reproducibility note (verified locally: rebuild from source produces an identical-size binary differing only in PE timestamp). Add version/product metadata via assembly attributes. Longer term: sign. |
| SEC-4 | Medium | Updater: `electron-updater` over GitHub releases **without code signing**; `latest.yml` sha512 protects integrity of the download but not authenticity of the publisher beyond GitHub account security. Auto-download is on by default. | Point at the new repo; document the trust model; keep the user switch; evaluate signing (owner decision). |
| SEC-5 | Medium | Electron **fuses not set** (`RunAsNode`, `EnableNodeOptionsEnvironmentVariable`, `EnableNodeCliInspectArguments` default on): a local attacker or malware can use the installed binary as a Node runtime. | Add `electronFuses` to the electron-builder config: `runAsNode:false`, `enableCookieEncryption:true`, `enableNodeOptionsEnvironmentVariable:false`, `enableNodeCliInspectArguments:false`, `enableEmbeddedAsarIntegrityValidation:true`, `onlyLoadAppFromAsar:true`. |
| SEC-6 | Low | No `session.setPermissionRequestHandler`; default Electron behaviour grants permissions (e.g. media, notifications) to any page. Only local pages and the YouTube iframe are loaded, so impact is low. | Deny everything by default; allow nothing for file: pages (battery API needs no permission). |
| SEC-7 | Low | `ipcMain.on('apps-add'/'apps-remove'/'apps-launch', id)` accept any type; downstream `catalog.some(a => a.id === id)` makes it safe but a non-string reaches `persist()` only after validation. `shelf-add` accepts any array of strings and `fs.existsSync` is the only gate — any existing file path can be put on the shelf, then opened with `shell.openPath` by a later click. This is by design (user drops files), but a compromised renderer could open arbitrary local files. | Type-check every IPC argument at the boundary; for the shelf, require that paths originate from `webUtils.getPathForFile` (preload) or main's own screenshot flow — add a per-drop nonce handed from preload to main. |
| SEC-8 | Low | `mini-open` passes `req.title` (≤ 200 chars) to the helper as a process argument; the helper only compares strings. `youtubeId` validates the id (`[\w-]{11}`) before building the embed URL. OK. | Keep; add a test for `youtubeId`. |
| SEC-9 | Low | Mini page CSP: `frame-src` limited to YouTube; `script-src` falls back to `default-src 'self'`. `postMessage` origin is checked. Good. The local HTTP server binds 127.0.0.1 on a random port and serves three files only. Any local process can load those files (harmless). | Add a random path token to the mini server URL so other local processes cannot guess it; respond 404 otherwise. |
| SEC-10 | Low | Screenshot capture writes PNGs to `Pictures\Nova Island` and reads `Pictures\Screenshots` newest file; an attacker-controlled filename is not involved. Clipboard image read is gated by the privacy flag. | Rename folder with the brand; keep behaviour. |
| SEC-11 | Low | `desktopCapturer` screen capture every 0.7–3 s for the glass backdrop is a privacy-relevant capability (the island sees the screen). It never leaves the process and is cropped to the island's bounds before being sent to the renderer. | Document in PRIVACY.md; add a setting to disable the live backdrop (static glass) for users who object. |
| SEC-12 | Low | Third-party geolocation endpoints receive the user's IP (inherent to IP geolocation). Three different vendors are tried in sequence. | Document; prefer one vendor with a clear privacy policy; keep manual city option prominent; consider Windows Location API via helper as an opt-in alternative. |
| SEC-13 | Low | `fetch(url)` of download thumbnails reported by IDM Nova: any `https?:` URL, 8 s timeout, 400 KB cap, content-type must be `image/*`. Reasonable. | Keep; add max redirect policy (`redirect: 'error'`) consideration. |
| SEC-14 | Low | `reg.exe` is spawned every 2 s for privacy dots (two queries). Not a security issue, but a performance/AV-noise one. | Consider moving the query into the helper (direct registry API) in a later stage. |
| SEC-15 | Info | Dependencies: `npm audit` at import reports deprecated transitive packages (`inflight`, `glob@7`, `rimraf@2`, `boolean`) via electron-builder; runtime deps are only `electron-updater` and `node-ical`. | Track with `npm audit` in CI; update electron-builder when a fixed release exists. |
| SEC-16 | Info | No telemetry, analytics or crash upload exists. | Keep; state it in PRIVACY.md. |

## Privacy data map (to be published as PRIVACY.md)
- **Stored locally only:** settings, pinned apps, shelf paths, prayer/weather caches, chosen
  city or IP-derived city, iCal URL (secret), download folders, mini player size, error log.
- **Read but never stored:** clipboard text (memory, ≤ 8 entries, cleared on toggle), clipboard
  images (until saved by the user or auto-shelved), screen pixels under the island, foreground
  window title/process, mic/camera usage registry, Start-menu catalogue (cached as names/ids).
- **Sent over the network:** IP (geolocation vendors), coordinates (Open-Meteo), nothing else
  except the user's own iCal URL, YouTube embed, GitHub for updates, and a connectivity probe.
