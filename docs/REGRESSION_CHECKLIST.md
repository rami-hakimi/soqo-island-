# Regression Checklist

Feature ids refer to `MIGRATION_PLAN.md` §2. Update the status column at the end of every
stage. Legend: ✅ verified · 🤖 automated test green · ⏳ not yet run · ❌ broken · ➖ not
applicable on this machine (note why).

| Id | Feature | How to verify | Stage 1 | Stage 2 | Stage 3 |
|---|---|---|---|---|---|
| S1 | Hover intent opens island, sweep does not | Launch, move cursor across, then rest on pill | ⏳ | | |
| S2 | Mode morphs (idle/compact/toast/peek/reminder/scene/expanded) | Trigger each | ⏳ | | |
| S3 | Drag, dock to top, centre snap, "placed" memory | Drag around, restart | ⏳ | | |
| S4 | Vertical mode left/right | Menu → Vertical, drag across centre | ⏳ | | |
| S5 | Multi-monitor layout | Move to second display, unplug | ➖ one display here | | |
| S6 | Address-bar slot in Chromium | Focus Chrome, type in omnibox | ⏳ | | |
| S7 | Hide in fullscreen; Show/Hide menu | Fullscreen video; toggle menu | ⏳ | | |
| S8 | Live glass backdrop | Move island over coloured window | ⏳ | | |
| S9 | Ctrl+Alt+I toggles; pin | Press shortcut | ⏳ | | |
| S10 | Tray menu items | Click tray | ⏳ | | |
| S11 | Single instance | Launch twice | ⏳ | ⏳ (launch reached island-ready) | |
| S12 | Reduced motion | Windows Settings → Animation effects off | ⏳ | | |
| S13 | Input focus only while typing | Apps → Add → type | ⏳ | | |
| M1 | SMTC now playing | Play in Spotify/YouTube | ⏳ | | |
| M2 | Transport controls | Buttons | ⏳ | | |
| M3 | Volume / mute / wheel / HUD | Slider, wheel on pill | ⏳ | | |
| M4 | Brightness | Laptop only | ➖ desktop? check | | |
| M5 | Compact pill, peek, accent | Change tracks | ⏳ | | |
| M6 | Media-in-front suppression | Switch to the playing tab | ⏳ | | |
| M7 | Mini player pop-out | YouTube in Chrome → pip button | ⏳ | | |
| M8 | Media keys isolation | Media keys still control the player | ⏳ | | |
| A1 | App catalogue, pins, reorder, launch | Apps tab | 🤖 helper `apps` returns 183 entries | | |
| A2 | App icons | Visual | ⏳ | | |
| F1 | Shelf drop/drag-out/open/reveal/clear/expiry | Drop a file | ⏳ | | |
| T1 | Timer presets, sounds | Timer tab | ⏳ | | |
| T2 | Focus sessions + scenes | Focus button | ⏳ | | |
| Y1 | CPU/RAM | Idle slide | ⏳ | | |
| Y2 | Weather + location fallbacks | System tab; set manual city | ⏳ | | |
| Y3 | Clipboard history + private skip | Copy text; copy from password manager | ⏳ | | |
| Y4 | Smart clipboard | Copy URL / `#ff0` / `2*(3+4)` / long text | 🤖 unit tests | | |
| Y5 | Screenshot toast + auto-shelf | Win+Shift+S | ⏳ | | |
| Y6 | Network toasts | Toggle Wi-Fi | ⏳ (linkKind 🤖) | | |
| Y7 | Battery toasts | Unplug | ➖ if desktop | | |
| Y8 | Keyboard language / Caps Lock | Alt+Shift, Caps | ⏳ | | |
| D1 | IDM Nova bridge | Needs IDM Nova installed | ➖ not installed | | |
| D2 | Browser download detection | Download a file in Chrome | 🤖 temp-dir simulation | | |
| D3 | Download folders in Settings | Add/remove | ⏳ | | |
| D4 | Downloads tab/pill/toasts | During a download | ⏳ | | |
| P1 | Prayer-time maths | Compare with AlAdhan for Cairo/Makkah | 🤖 golden values | | |
| P2 | Hijri date + adjust | Prayer tab | 🤖 | | |
| P3 | Prayer tab RTL | Visual | ⏳ | | |
| P4 | Adhan alerts + scene | Set PC clock near a prayer | ⏳ | | |
| P5 | Reminders cards, quiet hours | Settings → Show one now | ⏳ (quiet hours 🤖) | | |
| P6 | Religious text unchanged | Checksum test | 🤖 | | |
| C1 | Companion eyes | Rest cursor beside pill 3 s | ⏳ | | |
| C2 | Scenes with props | Adhan / water / focus | ⏳ | | |
| C3 | Welcome back / brief / care | Idle 5 min then move | ⏳ | | |
| C4 | Water reminder + goal | Wait interval / shorten in Settings | ⏳ | | |
| C5 | Celebrations | Finish a download | ⏳ | | |
| C6 | Meetings from iCal | Link a calendar | 🤖 parser; manual link | | |
| C7 | Privacy dots | Open Camera app | 🤖 parser; ⏳ manual | | |
| G1 | Settings window pages/search | Open Settings | ⏳ | | |
| G2 | Feature validation | Unit test | 🤖 | | |
| G3 | Start with Windows | Toggle; check Startup folder / Task Manager | ⏳ | | |
| G4 | Startup/data migration | Create old folder, launch | ⏳ | 🤖 unit (copy once, never overwrite, key map) | |
| G5 | Auto-update | Needs a published release | ➖ until release | | |
| G6 | Log rotation / report | Unit test; Copy report | 🤖 | | |
| G7 | Support links | Settings → Support | ⏳ owner decision | | |
| G8 | Installer / portable build | `npm run dist` | ⏳ | | |
