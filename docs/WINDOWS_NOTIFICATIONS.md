# Windows notifications on the island

Soqo Island can show the notifications Windows itself shows — including Chrome's web
notifications such as **WhatsApp Web** — on the island and on the Activity tab. Off by default.

## How it works
The helper uses Windows' official **notification listener**
(`Windows.UI.Notifications.Management.UserNotificationListener`), the same API Windows offers
to packaged apps for reading the notification centre. It reads, for each toast Windows holds:
the sending app's display name and AppUserModelId, the toast's title and body text, its id and
its time. Nothing else: no browser pages, no conversations, no cookies, no storage.

- **Opt-in.** Settings › Connections › *Show Windows notifications on the island*. Turning it
  on asks Windows for access (`RequestAccessAsync`) and shows the answer. Windows governs this
  through *Settings › Privacy & security › Notifications* ("Let apps access notifications");
  the Settings page has a button to that page.
- **Polling, not events.** Windows does not deliver the `NotificationChanged` event to apps
  without package identity (it fails with `0x80070490`), so the helper lists the toasts every
  1.5 s on a worker thread while the feature is on, and reports only ids that are new since
  the feature was enabled (nothing already in the notification centre is replayed). At most
  five new toasts per scan after a sleep.
- **Dismissed in Windows → gone here.** Ids that disappear from the notification centre are
  reported too and the island drops them.
- **Previews.** With *Show message previews* off, only the app and the title are shown.
- **Quiet.** The helper also reports Windows' own "accepts notifications" state
  (`SHQueryUserNotificationState`: busy, full-screen app, presentation mode, quiet time). While
  it says quiet, during a focus session, and while an app is full screen, new notifications are
  listed on the Activity tab but not announced with a toast.
- **No duplicates.** Each Windows id once; the same app, title and body within five seconds
  once.
- **Not stored.** The list lives in memory (30 items), never on disk; it is cleared when the
  feature is turned off. Nothing is sent anywhere.
- **Lock screen.** The island is a window on the user's desktop; it is never shown on the lock
  screen, and the glass capture pauses while the screen is locked.
- **Clicking** a notification brings the sending application's window to the front when it is
  one of a fixed list (Chrome, Edge, Firefox, Brave, Vivaldi, Opera, Discord, Slack, Teams,
  Telegram, WhatsApp, Spotify). No link from the notification is ever opened, no command run.
- **Soqo Island's own** toasts are filtered out.

## What Chrome notifications look like
Chrome delivers web notifications as native Windows toasts with AppUserModelId `Chrome` and
display name "Google Chrome". The listener exposes two text elements: the title (for WhatsApp
Web usually the contact or group) and the body. The site origin that Chrome puts into the
toast's attribution line is **not** exposed by the API, so the island cannot tell WhatsApp Web
from another Chrome site; it shows "Google Chrome · <title>". If WhatsApp Web is installed as a
PWA, Chrome uses the PWA's own name. Chrome must be allowed to use Windows notifications (its
default; `chrome://flags/#enable-system-notifications`).

## Feasibility findings (Windows 11 25H2, build 26200, unpackaged NSIS install)
Verified on 2026-11-02 with a plain .NET Framework exe and then with `soqo-helper.exe`:
- `UserNotificationListener.Current` works without package identity.
- `RequestAccessAsync()` returned `Allowed` without a prompt; the consent store
  (`HKCU\...\CapabilityAccessManager\ConsentStore\userNotificationListener`) holds a single
  global `Value=Allow` and no per-app `NonPackaged` entry, so unpackaged apps are governed by the
  global toggle only.
- `GetNotificationsAsync(Toast)` returned the notification centre's toasts, Chrome's included.
- `NotificationChanged +=` fails with `0x80070490` (reported for 24H2/25H2 by others too);
  hence polling.
- WinRT calls must stay on one thread: the helper creates the listener, requests access and
  scans on a dedicated worker thread.

This is de-facto behaviour, not a documented contract: Microsoft documents the API with the
`userNotificationListener` package capability. If a future Windows build closes it for
unpackaged apps, the supported path is **package identity** through a *package with external
location* (sparse package): an identity-only `.msix` with `AllowExternalContent`,
`runFullTrust`, `unvirtualizedResources` and `userNotificationListener`, the `<msix>` element in
the exe manifests, registered from the installer with `Add-AppxPackage -ExternalLocation`.
That package must be **signed with a certificate trusted on the user's machine**, so it is
blocked on the open code-signing decision (see `RELEASING.md`). The feature degrades to a clear
"Not available" state in Settings if the API refuses.

## Tests
`test/notifications.test.js`: opt-in gating, Windows' answer, previews off, duplicates,
ids Windows dropped, do-not-disturb, hostile payloads, "Open app" restricted to the fixed list.
Manual: enable, send any toast (e.g. from PowerShell's toast API or a Chrome site), see it on
the island and on the Activity tab; dismiss it in the notification centre, see it leave.
