"""Builds the application-ready artwork from the approved originals in assets/.

The originals are never modified. Outputs:
  build/icon.png (256), build/icon.ico (16..256), build/icon-512.png, build/icon-master.png (1024)
      from assets/branding/soqo-splash-icon.png: the rounded navy square is cropped out of its
      light backdrop and given a rounded-corner alpha.
  build/tray.png (32, white silhouette) and build/tray-color.png (32)
      the dolphin silhouette from the icon, for the Windows tray at 16 px.
  assets/soqi/<state>.png (10 states, 256x256, transparent)
      from assets/mascot/soqi-expression-sheet.png: each cell is cut above its label,
      the white backdrop is removed by a flood fill from the border (so the white belly stays),
      and the sprite is centred on a square canvas.
  assets/soqi/soqi-full.png (512, transparent)
      the full-body mascot, downsized.
  assets/soqi/sheet.json  the atlas description used by the renderer.

Requires Pillow. Run: python scripts/prepare-art.py
"""
import json, os
from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'assets')
BUILD = os.path.join(ROOT, 'build')
OUT = os.path.join(SRC, 'soqi')
ICON_SRC = os.path.join(SRC, 'branding', 'soqo-splash-icon.png')
SHEET_SRC = os.path.join(SRC, 'mascot', 'soqi-expression-sheet.png')
MASCOT_SRC = os.path.join(SRC, 'mascot', 'soqi-mascot.png')

STATES = ['idle', 'happy', 'excited', 'curious', 'listening', 'music', 'sleeping', 'notification', 'download', 'warning']


def icon():
    im = Image.open(ICON_SRC).convert('RGB')
    w, h = im.size
    # the square is dark navy; the backdrop is light. Find the bounding box of dark pixels.
    gray = im.convert('L')
    dark = gray.point(lambda v: 255 if v < 110 else 0)
    bbox = dark.getbbox()
    sq = im.crop(bbox)
    side = max(sq.size)
    sq = sq.resize((side, side), Image.LANCZOS) if sq.size[0] != sq.size[1] else sq
    master = sq.resize((1024, 1024), Image.LANCZOS).convert('RGBA')
    # rounded-corner alpha: the source square's radius is about 22 % of its side
    mask = Image.new('L', (1024, 1024), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, 1023, 1023), radius=int(1024 * 0.225), fill=255)
    master.putalpha(mask)
    master.save(os.path.join(BUILD, 'icon-master.png'))
    master.resize((512, 512), Image.LANCZOS).save(os.path.join(BUILD, 'icon-512.png'))
    png256 = master.resize((256, 256), Image.LANCZOS)
    png256.save(os.path.join(BUILD, 'icon.png'))
    png256.save(os.path.join(BUILD, 'icon.ico'), format='ICO', sizes=[(s, s) for s in (256, 128, 64, 48, 32, 24, 16)])

    # tray: the dolphin silhouette, white on transparent. Bright pixels inside the square (the
    # waves and the navy are darker), closed morphologically, largest connected blob only (drops
    # the bubbles), rendered at 32 px for a 16 px tray.
    small = master.resize((256, 256), Image.LANCZOS)
    lum = small.convert('L')
    binm = lum.point(lambda v: 255 if v > 115 else 0)
    binm = binm.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    binm = largest_component(binm)
    bb = binm.getbbox()
    sil = binm.crop(bb)
    side = max(sil.size) + 12
    canvas = Image.new('L', (side, side), 0)
    canvas.paste(sil, ((side - sil.size[0]) // 2, (side - sil.size[1]) // 2))
    canvas = canvas.filter(ImageFilter.GaussianBlur(0.6))
    for name, rgb in (('tray.png', (255, 255, 255)), ('tray-color.png', (127, 215, 255))):
        img = Image.new('RGBA', (side, side), rgb + (0,))
        img.putalpha(canvas)
        img.resize((32, 32), Image.LANCZOS).save(os.path.join(BUILD, name))
    print('icon: square bbox', bbox, '-> build/icon.*, build/tray.png')


def largest_component(binm):
    """Keeps only the largest 4-connected white region of a binary 'L' image."""
    w, h = binm.size
    px = binm.load()
    seen = bytearray(w * h)
    best = []
    for y0 in range(h):
        for x0 in range(w):
            if px[x0, y0] < 128 or seen[y0 * w + x0]:
                continue
            stack = [(x0, y0)]
            seen[y0 * w + x0] = 1
            comp = []
            while stack:
                x, y = stack.pop()
                comp.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and px[nx, ny] >= 128:
                        seen[ny * w + nx] = 1
                        stack.append((nx, ny))
            if len(comp) > len(best):
                best = comp
    out = Image.new('L', (w, h), 0)
    op = out.load()
    for x, y in best:
        op[x, y] = 255
    return out


def key_white(cell):
    """Make the white backdrop transparent by flooding from the border (interior whites stay)."""
    rgb = cell.convert('RGB')
    w, h = rgb.size
    probe = rgb.copy()
    sentinel = (255, 0, 255)
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
        if probe.getpixel(seed) != sentinel:
            ImageDraw.floodfill(probe, seed, sentinel, thresh=48)
    alpha = Image.new('L', (w, h), 255)
    ap = alpha.load()
    pp = probe.load()
    for y in range(h):
        for x in range(w):
            if pp[x, y] == sentinel:
                ap[x, y] = 0
    # soften the cut edge by one pixel
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.8))
    out = rgb.convert('RGBA')
    out.putalpha(alpha)
    return out


def segments(alpha_band, min_gap=12, min_width=60):
    """Column runs of a band's alpha with non-empty content, small gaps merged."""
    w, h = alpha_band.size
    px = alpha_band.load()
    occupied = [any(px[x, y] > 40 for y in range(0, h, 2)) for x in range(w)]
    runs = []
    x = 0
    while x < w:
        if not occupied[x]:
            x += 1
            continue
        start = x
        gap = 0
        while x < w and gap <= min_gap:
            gap = 0 if occupied[x] else gap + 1
            x += 1
        runs.append((start, x - gap))
    return [r for r in runs if r[1] - r[0] >= min_width]


def drop_edge_slivers(cell):
    """Clears small blobs touching the left/right cut edge: pieces of the neighbouring character."""
    w, h = cell.size
    alpha = cell.getchannel('A')
    px = alpha.load()
    seen = bytearray(w * h)
    out = cell.copy()
    op = out.load()
    for y0 in range(h):
        for x0 in (0, w - 1):
            if px[x0, y0] <= 40 or seen[y0 * w + x0]:
                continue
            stack = [(x0, y0)]
            seen[y0 * w + x0] = 1
            comp = []
            while stack:
                x, y = stack.pop()
                comp.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and px[nx, ny] > 40:
                        seen[ny * w + nx] = 1
                        stack.append((nx, ny))
            if len(comp) < 0.03 * w * h:
                for x, y in comp:
                    op[x, y] = (0, 0, 0, 0)
    return out


def stickers():
    sheet = key_white(Image.open(SHEET_SRC).convert('RGB'))
    W, H = sheet.size
    # the two rows of characters; the label pills below each row are left out of the bands
    bands = [(int(H * 0.02), int(H * 0.44)), (int(H * 0.53), int(H * 0.865))]
    os.makedirs(OUT, exist_ok=True)
    atlas = {}
    i = 0
    for top, bottom in bands:
        band = sheet.crop((0, top, W, bottom))
        alpha = band.getchannel('A')
        runs = segments(alpha)
        # two neighbours touching (a raised fin, a floating mark): split the wide run where the
        # band is thinnest in its middle half
        ap = alpha.load()
        bh = bottom - top
        counts = [sum(1 for y in range(0, bh, 2) if ap[x, y] > 40) for x in range(W)]
        split = []
        for x0, x1 in runs:
            if x1 - x0 > W / 5 * 1.3:
                lo, hi = x0 + (x1 - x0) // 4, x1 - (x1 - x0) // 4
                cut = min(range(lo, hi), key=lambda x: counts[x])
                split += [(x0, cut), (cut, x1)]
            else:
                split.append((x0, x1))
        runs = split
        assert len(runs) == 5, f'expected 5 characters in the band, found {len(runs)}: {runs}'
        for x0, x1 in runs:
            name = STATES[i]
            i += 1
            cell = drop_edge_slivers(band.crop((x0, 0, x1, bottom - top)))
            cell = cell.crop(cell.getbbox())
            side = max(cell.size) + 16
            canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
            canvas.paste(cell, ((side - cell.size[0]) // 2, (side - cell.size[1]) // 2), cell)
            canvas = canvas.resize((256, 256), Image.LANCZOS)
            canvas.save(os.path.join(OUT, f'{name}.png'), optimize=True)
            atlas[name] = {'file': f'{name}.png', 'size': 256}
    mascot = Image.open(MASCOT_SRC).convert('RGBA')
    mascot = mascot.crop(mascot.getbbox())
    mascot = ImageOps.pad(mascot, (max(mascot.size),) * 2, color=(0, 0, 0, 0))
    mascot.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'soqi-full.png'), optimize=True)
    with open(os.path.join(OUT, 'sheet.json'), 'w', encoding='utf-8', newline='
') as f:
        json.dump({'source': '../mascot/soqi-expression-sheet.png', 'states': atlas, 'full': 'soqi-full.png'}, f, indent=2)
        f.write('
')
    print('stickers:', ', '.join(STATES), '-> assets/soqi/')


if __name__ == '__main__':
    os.makedirs(BUILD, exist_ok=True)
    icon()
    stickers()
