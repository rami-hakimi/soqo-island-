# Regression Checklist

Feature ids refer to `archive/MIGRATION_PLAN.md` §2. Update the status column at the end of every
stage. Legend: ✅ verified · 🤖 automated test green · ⏳ not yet run · ❌ broken · ➖ not
applicable on this machine (note why).

| Id | Feature | How to verify | Stage 1 | Stage 2 | Stage 3 |
|---|---|---|---|---|---|
| S1 | Hover intent opens island, sweep does not | Launch, move cursor across, then rest on pill | ⏳ | | |
| S2 | Mode morphs (idle/compact/toast/peek/reminder/scene/expanded) | Trigger each | ⏳ | | |
| S3 | Drag, dock to top, centre snap, "placed" memory | Drag around, restart | ⏳ | | 🤖 placement.test.js (clamping, docking, second display, idempotence); ✅ beta.3: position restored across quit/relaunch on the installed build |
| S4 | Vertical mode left/right | Menu → Vertical, drag across centre | ⏳ | | |
| S5 | Multi-monitor layout | Move to second display, unplug | ➖ one display here | | |
| S6 | Address-bar slot in Chromium (opt-in since beta.3) | Settings › General › Browser address bar on; focus Chrome, type in omnibox | ⏳ | | ✅ beta.2 reproduced the island following a half-off-screen Chrome window to mid-screen; beta.3: off by default, skipped when the slot is off screen, page text fields ignored |
| S7 | Hide in fullscreen / while maximized (opt-in); Hide/Show island menu; second launch reveals | Chrome F11; maximize with the option on; menu Hide island → tray Show island → Hide → start the app again | ⏳ | | 🤖 visibility.test.js (hide→restore, tray, second launch, restart, Focus Mode); ✅ beta.4 real mouse: right-click › Hide island, tray flyout › Show island, hidden + second launch revealed, F11 + second launch logged the reason, back after F11 |
| S8 | Live glass backdrop | Move island over coloured window | ⏳ | | |
| S9 | Ctrl+Alt+I toggles; pin | Press shortcut | ⏳ | | |
| S10 | Tray menu items | Click tray | ⏳ | | ✅ beta.4: icon found in the hidden-icons flyout by UI Automation; menu lists Show/Hide island, Vertical, Reset position, Launch at startup, Expand/collapse, Focus Mode, Settings, Quit; Show island restored the island |
| S11 | Single instance | Launch twice | ⏳ | ⏳ (launch reached island-ready) | |
| S12 | Reduced motion | Windows Settings → Animation effects off | ⏳ | | 🤖 CSS rule present; Soqi Movement switch |
| S13 | Input focus only while typing | Apps → Add → type | ⏳ | | |
| M1 | SMTC now playing | Play in Spotify/YouTube | ⏳ | | ✅ real Chrome session: title, artwork, duration, volume shown (Stage 10) |
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
| T1 | Timer presets, sounds, pill sizes | Timer tab; Settings › Timer | ⏳ | | ✅ Small/Medium/Large pills, hover controls, pause/resume accuracy, AR (Stage 12); ✅ beta.4: Large 400 × 88 / 64 px, mini 168 × 28 over Chrome and Explorer, Large back after Win+D, no flicker on rapid switching, 0 s drift over 49 s; sounds ⏳ |
| T2 | Focus Mode | Timer tab › full-screen button; Esc; Pause / Resume / Cancel; presets | ⏳ | | ✅ beta.4 real mouse: opened by click, full screen on the island's display, island hidden while in front and back after Esc / Exit / Alt+Tab to Chrome (mini pill); Pause held the countdown for 3 s, Space toggles, Cancel, preset 25 and Focus session drive the island's timer; ar (RTL) and nl strings |
| T2 | Focus sessions + scenes | Focus button | ⏳ | | |
| Y1 | CPU/RAM | Idle slide | ⏳ | | |
| Y2 | Weather + location fallbacks | System tab; set manual city | ⏳ | | |
| Y3 | Clipboard history + private skip | Copy text; copy from password manager | ⏳ | | ✅ two copies listed (Stage 11); private-copy skip ⏳ |
| Y4 | Smart clipboard | Copy URL / `#ff0` / `2*(3+4)` / long text | 🤖 unit tests | | |
| Y5 | Screenshot toast + auto-shelf | Win+Shift+S | ⏳ | | |
| Y6 | Network toasts | Toggle Wi-Fi | ⏳ (linkKind 🤖) | | |
| Y7 | Battery toasts | Unplug | ➖ if desktop | | |
| Y8 | Keyboard language / Caps Lock | Alt+Shift, Caps | ⏳ | | |
| D1 | IDM Nova bridge | Needs IDM Nova installed | ➖ not installed | | |
| D2 | Browser download detection | Download a file in Chrome | 🤖 temp-dir simulation | | ✅ real Downloads folder: completion toast, list row, Soqi download mood (Stage 11) |
| D3 | Download folders in Settings | Add/remove | ⏳ | | |
| D4 | Downloads tab/pill/toasts | During a download | ⏳ | | |
| P1 | Prayer-time maths | Compare with AlAdhan for Cairo/Makkah | 🤖 golden values | | |
| P2 | Hijri date + adjust | Prayer tab | 🤖 | | |
| P3 | Prayer tab RTL / i18n | Visual | ⏳ | | ✅ CDP screenshots EN + AR (Stage 5) |
| P4 | Adhan alerts + scene | Set PC clock near a prayer | ⏳ | | |
| P5 | Reminders cards, quiet hours | Settings → Show one now | ⏳ (quiet hours 🤖) | | |
| P6 | Religious text unchanged | Checksum test | 🤖 | | 🤖 re-pinned 2026-11-02 after the reviewed switch to the Tanzil text (25/25 passages verified against the official download) |
| L1 | Dutch interface (nl-NL): strings, dates, plurals, language switch, installer language | Settings › General › Nederlands; island + Settings pages | ⏳ | | ✅ Stage 16: 473/473 keys (gate + test), live switch en→nl→ar→en, `ma 2 nov` / `14:05`, dismissal 4/4 in nl; NSIS nl_NL added; native review pending |
| C8 | Soqi click reaction, idle motion, no island opening from Soqi | Rest pointer on Soqi beside the pill, click, move onto the pill | ⏳ | | ✅ Stage 16 real mouse: pointer on Soqi → window interactive, island stays closed (`soqiHot`); click → swim animation + happy/excited; pointer onto the pill → opens; Settings › "Say hi" works; reduced-motion CSS |
| S14 | Glass pauses and content protection drops while a screen recorder runs; back afterwards | Start a process named obs64/nvsphelper64, watch the log and the static pane; stop it | ⏳ | | ✅ Stage 17 (simulated with a renamed process) |
| S15 | No glass capture while the screen is locked | Lock Windows, check the log / CPU; unlock | ⏳ | | ⏳ not exercised by automation (needs a real lock/unlock) |
| P7 | Card × closes on first click and releases the mouse | Show a Qur'an card and a scene; click × once with a real mouse; click again where it was | ⏳ | | ✅ Stage 15: 22/22 first clicks (live glass on), scene card too, second click reaches the window underneath, island does not reopen under the pointer; `hover-policy` 🤖 |
| C1 | Companion peek (Soqi, was eyes) | Rest cursor beside pill 3 s | ⏳ | ✅ CDP screenshot (curious/happy beside pill, over top when floating) | |
| C2 | Scenes (Soqi porthole + card) | Adhan / water / focus | ⏳ | ✅ CDP screenshots adhan + focus | |
| C3 | Welcome back / brief / care | Idle 5 min then move | ⏳ | | |
| C4 | Water reminder + goal | Wait interval / shorten in Settings | ⏳ | | |
| C5 | Celebrations (+ Soqi excited) | Finish a download | ⏳ | 🤖 state machine; sparkles ⏳ | |
| C6 | Meetings from iCal | Link a calendar | 🤖 parser; manual link | | |
| C7 | Privacy dots | Open Camera app | 🤖 parser; ⏳ manual | | |
| G1 | Settings window pages/search | Open Settings | ⏳ | ✅ opened via IPC, Companion + Support screenshotted | |
| G2 | Feature validation | Unit test | 🤖 | | |
| G3 | Launch at Windows startup | Toggle; check Startup folder / Run key | ⏳ | | ✅ dev: Startup .lnk created/removed; installed: HKCU Run value set/cleared via Settings (Stage 11) |
| G4 | Startup/data migration | Create old folder, launch | ⏳ | 🤖 unit (copy once, never overwrite, key map) | |
| G5 | Auto-update | Needs a published release | ➖ until release | | |
| G6 | Log rotation / report | Unit test; Copy report | 🤖 | | |
| G7 | Support links | Settings → Support | ⏳ owner decision | | |
| G8 | Installer / uninstaller | `npm run dist`, silent install | ⏳ | | ✅ silent install 22 s to %LOCALAPPDATA%\Programs, shortcuts, GUI subsystem, uninstall removes exe/shortcuts/Run value (Stage 11) |
