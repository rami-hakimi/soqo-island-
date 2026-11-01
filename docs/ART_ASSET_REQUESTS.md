# Art Assets — integrated and still needed

Soqo Island ships only original artwork. Upstream's Nova logo and the Nova character imagery
(`promo/`) have been removed from the tree (they remain in Git history under the upstream
commits) and nothing in the app references them.

## Approved originals (kept untouched in `assets/`)
| File | Size | Used for |
|---|---|---|
| `Cute Dolphin Splash App Icon.png` | 1254×1254 RGB | App icon, installer icon, tray silhouette |
| `Cute Glossy Blue Dolphin Mascot.png` | 1254×1254 RGBA | Settings › Companion hero |
| `Glossy Soqi Dolphin Emotion Sticker Sheet.png` | 1536×1024 RGB | Soqi's ten states |
| `Soqo Island Dolphin Brand Sheet.png` | 1536×1024 RGBA | Reference: palette `#0B1B2B #00C9BB #00A8FF #7FD7FF #F5FAFF`, logo lockup, UI direction |
| `Soqo Island Ocean Breeze Player.png` | 1672×941 RGB | Reference for the music view redesign (Stage 7) |

The originals are excluded from the installer (`!assets/*.png`); only the derived files ship.

## Derived, application-ready files (`python scripts/prepare-art.py`, reproducible)
| Output | From | Notes |
|---|---|---|
| `build/icon-master.png` 1024, `build/icon-512.png`, `build/icon.png` 256, `build/icon.ico` (256…16) | icon original | Rounded navy square cropped out of its light backdrop, 22.5 % corner radius alpha |
| `build/tray-color.png`, `build/tray.png` 32 px | icon original | Dolphin silhouette (largest bright blob), brand cyan / white; the tray uses the cyan one at 16 px |
| `assets/soqi/{idle,happy,excited,curious,listening,music,sleeping,notification,download,warning}.png` 256 px | sticker sheet | Each character segmented by content (not a fixed grid), white backdrop removed by border flood-fill so the white belly survives, cut-edge slivers dropped, centred on a square |
| `assets/soqi/soqi-full.png` 512 px | mascot original | Transparent, padded square |
| `assets/soqi/sheet.json` | — | State → file map |

These are **still images animated with CSS** (bob, breathe, wiggle, nod, shiver, lean toward the
cursor). They are not rigged 3D models and are not described as such anywhere in the app.

## Still needed (optional, improves quality)
1. **Tray icon, hand-tuned** — `build/tray.png` is derived automatically. A hand-drawn 16×16 and
   32×32 monochrome dolphin (white, transparent background, PNG) will read better on the
   taskbar. Filenames: `build/tray-16.png`, `build/tray-32.png`.
2. **Sleeping variant facing right** — the sleeping sticker is a curled-up pose that reads well;
   no change needed unless you want a "dozing on the island" pose with the head on the pill's
   edge (256×256, transparent, same style). Filename: `assets/soqi/sleeping-edge.png`.
3. **Two-frame variants for subtle motion** (optional): `music-2.png` (head tilted the other way),
   `idle-2.png` (blink). 256×256, transparent, identical framing to the single-frame files. The
   state machine will alternate frames every ~1.2 s when a `-2` file exists.
4. **Hero / store imagery** — seven 1600×1000 PNG scenes (hero, Soqi, music, downloads, smart
   clipboard, prayer, settings) will be rendered from the real app after the visual refresh.
   Nothing to draw by hand unless you want illustrated backgrounds.
5. **Settings window logo** — the title bar still uses a small CSS pill as its mark. A 20×20 /
   40×40 PNG of the dolphin silhouette (cyan on transparent) would replace it:
   `assets/brand/mark-20.png`, `assets/brand/mark-40.png`.

## Rules
- No copyrighted or trademarked characters, no reuse of Nova artwork.
- Qur'an verses and religious text are never redrawn or stylised beyond the KFGQPC font.
- Generated or rendered imagery is never described as a 3D model or a finished animation.
