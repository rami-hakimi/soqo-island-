# Art Asset Requests

Soqo Island ships only original artwork. Upstream's Nova logo (`build/icon.*`) and the Nova
character imagery under `promo/` are the upstream project's marks and must not appear in any
Soqo Island build or store listing. Status of each asset:

| Asset | Status | Where |
|---|---|---|
| App icon | **Development placeholder** generated in code by `scripts/make-icon.py` (dark-glass rounded square, ocean gradient, island pill, stylised leaping dolphin). Usable, not final. | `build/icon.png`, `build/icon.ico`, `build/icon-512.png` |
| Soqi in-island eyes / face | Drawn in CSS/SVG (Stage 6) | `style.css`, `index.html` |
| Soqi scene character (body, fins, props) | Drawn in SVG (Stage 6) | `index.html` `.sc` |
| Store / README hero imagery | Not started — generation prompts below | `promo/` (to be replaced) |

## 1. Final application icon
- **Prompt:** "Flat, modern app icon for a Windows desktop utility called Soqo Island. A
  rounded square with a deep navy-to-teal ocean gradient and a subtle glass sheen. In the
  lower half, a small dark pill-shaped 'island' with a glowing cyan dot. Leaping above it, a
  friendly stylised dolphin named Soqi in light cyan with a white belly, anime-inspired but
  simple, single curved silhouette, one bright eye. No text. Premium, minimal, crisp edges,
  centred composition."
- **Sizes:** master 1024×1024 PNG with transparency; exports 512, 256, 128, 64, 48, 32, 24,
  16 (ICO must include 256 as PNG-compressed and 16–48 as hand-tuned if possible).
- **Files:** `build/icon-master.png`, `build/icon.png` (256), `build/icon.ico`.
- **Integration:** electron-builder reads `build/icon.ico`; the tray uses `build/icon.png`
  resized to 16 px — a dedicated `build/tray.png` (monochrome white, 32×32) is welcome.

## 2. Soqi expression sheet (only if the SVG rig is judged insufficient)
- **Prompt:** "Character sheet of Soqi, an original fantasy-anime dolphin mascot, light cyan
  body, white belly, large expressive eye, small rounded dorsal fin. Front-facing head and
  shoulders inside a soft dark-glass pill. Expressions: idle neutral, sleeping (closed eyes,
  'z'), happy (curved eyes, open smile), curious (tilted head, one raised brow-line),
  listening to music (bobbing, small notes), notification (alert eyes, small bell), download
  complete (holding a glowing package), warning (worried eyes, small exclamation). Flat
  vector style, transparent background, consistent line weight, no text."
- **Format:** SVG preferred (one file per state, 128×128 viewBox); PNG fallback 256×256 with
  transparency, 2 frames minimum per animated state (sleep breathing, music bob).
- **Filenames:** `assets/soqi/idle.svg`, `sleep.svg`, `happy.svg`, `curious.svg`, `music.svg`,
  `notify.svg`, `download.svg`, `warning.svg`.
- **Integration:** `views/soqi.js` state machine maps state → file; CSS crossfades 180 ms.

## 3. README / store imagery
Seven 1600×1000 PNG scenes mirroring `promo/en/*.png` (hero, Soqi, browser, downloads, smart,
faith, settings) rendered from the real app once the visual refresh (Stage 7) lands. No
generated image may be described as a 3D model; they are rendered screenshots or 2D art.

## Rules
- No copyrighted or trademarked characters, no reuse of Nova artwork.
- Qur'an verses and religious text are never redrawn or stylised beyond the KFGQPC font.
- Every placeholder is named `*-placeholder*` or listed above as such until replaced.
