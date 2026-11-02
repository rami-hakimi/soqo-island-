# Future roadmap

What is done, what is deliberately deferred, and what is only research. Nothing in the
"deferred" and "research" sections is in the product today; Settings never advertises them.

## Integrations completed (2.0.0-beta.5)
| Area | State | Where |
|---|---|---|
| Battery in the System tab (percentage, charging / plugged / discharging / full, low and critical states, time left when Windows knows it; omitted on PCs without a battery) | **done**, from `GetSystemPowerStatus` through the helper | `helper/Power.cs`, `src/shared/battery.js` |
| Weather data credit: compact info control with provider, licence and city-search credit, plus the small visible link Open-Meteo's licence requires | **done** | `views/system.js`, `docs/PRIVACY.md`, `NOTICE.md` |
| Coding agents — Claude Code and Codex CLI sessions on the Activity tab: start, working, idle, finished, failed, needs approval; terminal focusing; opt-in Connect / Disconnect with backups | **done** (approvals read-only by design) | `docs/CODING_AGENTS.md` |
| Activity tab (coding agents + recent notifications) | **done** | `views/activity.js` |
| Windows notifications on the island (Chrome / WhatsApp Web included), opt-in, previews switch, quiet with do-not-disturb | **done** on Windows 11 for the unpackaged build; see the feasibility notes | `docs/WINDOWS_NOTIFICATIONS.md` |

## Deferred (planned, not started)
- **Approve / deny coding-agent requests from the island.** Both agents' `PermissionRequest`
  hooks support a decision reply when the hook stays attached; needs its own security review
  and real-agent testing before it ships (`docs/CODING_AGENTS.md` › Future).
- **Package identity (sparse package)** for the installer, so Windows' notification *events*
  and `ClearNotifications` work and the app has a proper privacy entry; blocked on code
  signing.
- **Full plugin marketplace** (upstream Nova Island 1.5/1.6 has a plugin system; skipped in the
  rebuild).
- **Complete theme system** beyond the ocean glass.
- **Eco Mode** (reduced polling and effects on battery; the battery readings now exist).
- **Advanced battery diagnostics** (health, cycle count, per-app drain).
- **Calendar account synchronisation** (OAuth to Google / Microsoft accounts; today: iCal link).
- **Synchronized lyrics** in the music view.
- **Advanced Soqi automation** (routines, click gestures beyond "say hi").
- **AI chat assistants** inside the island.

## Research only
- Windows Terminal tab-level focusing through UI Automation.
- Codex daemon mode (`codex app-server`) as a richer, local status source.
- Native-speaker review of Arabic and Dutch (open since beta.2).
- Multi-monitor and Windows 10 validation of the Activity tab and toasts.

## Not planned
- Reading agent transcripts or prompts; sending any session or notification data off the PC;
  bypassing an agent's permission model; browser injection or scraping for notifications.
