# Privacy

Soqo Island runs entirely on your PC. It has no account, no analytics, no crash reporting and
no telemetry of any kind. This page lists exactly what it reads, what it stores and what
leaves your computer.

## Stored on your PC only (`%APPDATA%\soqo-island`)
Island position and orientation, feature switches, pinned apps and the cached Start-menu
catalogue (names and ids), shelf file paths, prayer and weather caches, the city you chose or
the one found from your IP, the iCal link you entered (a secret URL: it is written to
`calendar.json` and never logged), download folders you added, mini-player size, and an
error log (`soqo.log`, ≤ 1 MB, no clipboard text, no links, no file contents).

## Read while running, never stored
- **Clipboard text** for the clipboard history (memory only, 8 entries, cleared when the
  switch is turned off) and the smart clipboard. Copies that password managers mark as
  private are never read. **Copied images** are kept in memory until you save them or they are
  auto-shelved; the saved file goes to `Pictures\Soqo Island`.
- **Screen pixels under the island** (a low-resolution crop) to draw the live glass backdrop.
  Not captured while the screen is locked, while the live glass is switched off, or while a
  screen recorder (NVIDIA Share, OBS, Streamlabs) is running; in the last case the island also
  stops asking Windows to hide it from captures, so recordings are not affected. The helper
  only looks at process names for this, every two seconds.
- **The window in front**: its process name, title, whether it is full screen or maximized, whether it is the desktop or the taskbar, and
  (only with the opt-in address-bar slot) the position of a Chromium browser's address bar. Used
  to hide or place the island; nothing is stored or sent.
- **Weather and city search** come from Open-Meteo (CC BY 4.0, free for non-commercial use);
  the credit link sits next to the weather in the System tab and under Settings › Location.
  They never leave the process and are not written anywhere.
- **The foreground window's title and process**, keyboard layout and Caps Lock, idle time
  and fullscreen state, from the helper, to show media, toasts and to hide in full screen.
- **Microphone / camera usage** from Windows' CapabilityAccessManager registry, to show the
  privacy dots.
- **Download folders**: file names and sizes of partial files; no file is opened or read.
- **Battery** (System tab): Windows' power status (percentage, charging, time left), every 2 s
  through the helper; shown, never stored.
- **Coding agents** (opt-in, Settings › Connections): when you connect Claude Code or Codex
  CLI, their own hooks run `soqo-helper.exe hook <agent>`, which forwards to the island only
  the session id, the event name, the working directory, the tool's name and the single field
  that describes the request (the command line, file path, URL or search pattern, cut at 400
  characters). Prompts, replies, file contents, transcripts and the transcript path never leave
  the hook. The island keeps the sessions in memory (at most 32, forgotten after two hours),
  never on disk, and never answers an approval — that stays in the terminal. The hook also
  reports which terminal window the agent runs in (its parent processes and window title) so
  the island can bring it to the front. See `docs/CODING_AGENTS.md`.
- **Windows notifications** (opt-in, Settings › Connections): the toasts Windows keeps in its
  notification centre, read through Windows' notification listener — the sending app's name,
  title and body (body only with previews on). Nothing is read from the apps themselves, the
  list lives in memory (30 items), nothing is written to disk, and Windows' own permission
  governs access. See `docs/WINDOWS_NOTIFICATIONS.md`.

## Sent over the network
| To | What | Why | Switch |
|---|---|---|---|
| ipwho.is, geojs.io, ipapi.co | your IP address (inherent to the request) | find your city for weather and prayer times, once a day | pick a city manually in Settings › General |
| api.open-meteo.com | coordinates | weather | Clock & weather slide |
| geocoding-api.open-meteo.com | the city name you type | city search | only when you search |
| msftconnecttest.com | a plain GET | "is the internet reachable" | Network |
| your iCal URL | the request itself | meetings | Calendar |
| github.com (releases) | version check | updates | Auto-update |
| youtube.com | the embedded video | mini player | only when you pop a video out |
| 127.0.0.1:17890 | local only | IDM Nova, if installed | IDM Nova downloads |

Nothing else. Coding-agent events and Windows notifications never leave the PC: the hooks talk
to the island over a local named pipe (no network port), and the island sends nothing on. No request carries an identifier of you or of your installation.

## Permissions
The app never asks Windows or Chromium for microphone, camera or location permissions; all
web-content permission requests are denied by design. The only permission it asks Windows for
is **notification access**, and only when you turn *Show Windows notifications on the island*
on (Windows governs it under Settings › Privacy & security › Notifications).

## Files outside the data folder
Connecting a coding agent edits that agent's user-level hook file after asking you —
`%USERPROFILE%\.claude\settings.json` (Claude Code) or `%USERPROFILE%\.codex\hooks.json`
(Codex CLI) — adds only Soqo Island's own entries, keeps a timestamped backup next to the file
and removes exactly those entries on Disconnect. Project-level agent configuration is never
touched. The bridge the hooks talk to is a named pipe whose name and token are written to
`%APPDATA%\soqo-island\agents-bridge.json` while the feature is on.

## Third-party content
Religious texts and the KFGQPC font are included locally; nothing is fetched for them.
