"""Generates the Soqo Island application icon (build/icon.png + build/icon.ico).

Original artwork drawn in code: a dark-glass rounded square with an ocean gradient, a small
floating "island" pill, and Soqi, a stylised dolphin leaping over it. This is a development
placeholder of acceptable quality; docs/ART_ASSET_REQUESTS.md carries the brief for a final
hand-made icon. Requires Pillow. Run: python scripts/make-icon.py
"""
from PIL import Image, ImageDraw, ImageFilter
import math, os

S = 1024          # render size (downsampled for anti-aliasing)
OUT = os.path.join(os.path.dirname(__file__), '..', 'build')

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def gradient(size, top, bottom):
    img = Image.new('RGB', (size, size))
    px = img.load()
    for y in range(size):
        c = lerp(top, bottom, y / (size - 1))
        for x in range(size):
            px[x, y] = c
    return img

def rounded_mask(size, radius):
    m = Image.new('L', (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return m

def bezier(p0, p1, p2, p3, n=40):
    pts = []
    for i in range(n + 1):
        t = i / n
        x = (1-t)**3*p0[0] + 3*(1-t)**2*t*p1[0] + 3*(1-t)*t**2*p2[0] + t**3*p3[0]
        y = (1-t)**3*p0[1] + 3*(1-t)**2*t*p1[1] + 3*(1-t)*t**2*p2[1] + t**3*p3[1]
        pts.append((x, y))
    return pts

def dolphin(scale=1.0, dx=0, dy=0):
    """Closed polygon of a leaping dolphin, nose at the right, in a 1000x1000 space."""
    f = lambda pts: [(x * scale + dx, y * scale + dy) for x, y in pts]
    body = []
    # back: from the tail joint up over the dorsal area to the nose (rostrum)
    body += bezier((190, 560), (260, 300), (520, 180), (700, 270))
    # dorsal fin
    body += [(640, 230), (600, 150), (570, 240)]
    body += bezier((700, 270), (780, 300), (860, 360), (900, 400))   # head to nose
    body += [(905, 412), (880, 430)]                                   # beak tip
    # belly: back along the underside to the tail joint
    body += bezier((880, 430), (760, 470), (560, 520), (420, 560))
    # pectoral fin (hangs below)
    body += [(560, 520), (600, 640), (520, 620), (470, 555)]
    body += bezier((470, 555), (380, 590), (300, 620), (240, 640))
    # tail flukes
    body += [(170, 720), (110, 690), (160, 620), (90, 560), (150, 540), (190, 560)]
    return f(body)

def main():
    # background: deep ocean glass
    bg = gradient(S, (12, 28, 54), (6, 98, 118))
    # soft radial glow at the lower centre (turquoise)
    glow = Image.new('RGB', (S, S), (0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse((S*0.12, S*0.45, S*0.88, S*1.25), fill=(20, 170, 190))
    glow = glow.filter(ImageFilter.GaussianBlur(140))
    bg = Image.blend(bg, Image.composite(glow, bg, glow.convert('L').point(lambda v: min(255, v))), 0.55)

    layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # horizon waves (two translucent sine bands)
    for k, (amp, y0, alpha) in enumerate([(22, 690, 60), (16, 740, 40)]):
        pts = [(x, y0 + amp * math.sin(x / 90 + k)) for x in range(0, S + 1, 8)]
        d.polygon(pts + [(S, S), (0, S)], fill=(120, 230, 240, alpha))

    # the island pill (dark glass with a highlight edge)
    pill = (S*0.28, S*0.60, S*0.72, S*0.70)
    d.rounded_rectangle(pill, radius=S*0.05, fill=(10, 14, 24, 230), outline=(255, 255, 255, 70), width=4)
    # a cyan "now playing" dot and three bars inside the pill, echoing the live island
    d.ellipse((S*0.33, S*0.63, S*0.37, S*0.67), fill=(94, 234, 212, 255))
    for i, h in enumerate([0.028, 0.045, 0.034]):
        x = S*0.60 + i*S*0.035
        d.rounded_rectangle((x, S*0.65 - S*h, x + S*0.016, S*0.65 + S*h), radius=8, fill=(120, 220, 255, 255))

    # Soqi: dolphin leaping over the pill, light cyan body with a white belly highlight
    poly = dolphin(scale=0.62, dx=S*0.14, dy=S*0.03)
    shadow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).polygon([(x+10, y+18) for x, y in poly], fill=(0, 20, 40, 110))
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    layer = Image.alpha_composite(layer, shadow)
    d = ImageDraw.Draw(layer)
    d.polygon(poly, fill=(142, 236, 255, 255))
    # belly highlight: a lighter inner shape along the underside
    belly = bezier((860, 425), (740, 462), (560, 512), (430, 552)) + bezier((430, 552), (560, 500), (740, 440), (860, 405))
    d.polygon([(x*0.62 + S*0.14, y*0.62 + S*0.03) for x, y in belly], fill=(236, 252, 255, 255))
    # eye
    ex, ey = 800*0.62 + S*0.14, 350*0.62 + S*0.03
    d.ellipse((ex-11, ey-11, ex+11, ey+11), fill=(10, 20, 40, 255))
    d.ellipse((ex-4, ey-6, ex+2, ey), fill=(255, 255, 255, 255))

    # sheen on the top-left of the glass
    sheen = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(sheen).ellipse((-S*0.2, -S*0.5, S*0.9, S*0.35), fill=(255, 255, 255, 38))
    sheen = sheen.filter(ImageFilter.GaussianBlur(60))

    out = Image.alpha_composite(bg.convert('RGBA'), sheen)
    out = Image.alpha_composite(out, layer)
    mask = rounded_mask(S, int(S * 0.225))
    out.putalpha(mask)
    # thin inner border like a glass edge
    border = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(border).rounded_rectangle((2, 2, S-3, S-3), radius=int(S*0.225), outline=(255, 255, 255, 60), width=6)
    out = Image.alpha_composite(out, border)

    os.makedirs(OUT, exist_ok=True)
    png = out.resize((256, 256), Image.LANCZOS)
    png.save(os.path.join(OUT, 'icon.png'))
    sizes = [256, 128, 64, 48, 32, 24, 16]
    png256 = out.resize((256, 256), Image.LANCZOS)
    png256.save(os.path.join(OUT, 'icon.ico'), format='ICO', sizes=[(s, s) for s in sizes])
    out.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-512.png'))
    print('wrote build/icon.png, build/icon.ico, build/icon-512.png')

if __name__ == '__main__':
    main()
