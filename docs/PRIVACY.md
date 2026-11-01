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
  They never leave the process and are not written anywhere.
- **The foreground window's title and process**, keyboard layout and Caps Lock, idle time
  and fullscreen state, from the helper, to show media, toasts and to hide in full screen.
- **Microphone / camera usage** from Windows' CapabilityAccessManager registry, to show the
  privacy dots.
- **Download folders**: file names and sizes of partial files; no file is opened or read.

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

Nothing else. No request carries an identifier of you or of your installation.

## Permissions
The app never asks Windows or Chromium for microphone, camera, location or notification
permissions; all web-content permission requests are denied by design.

## Third-party content
Religious texts and the KFGQPC font are included locally; nothing is fetched for them.
