#!/usr/bin/env python3
"""Comet Garden social pack: the gates and the review previews (run by scrapbook-social.mjs).

    python3 store/tools/scrapbook-social-post.py --work=<work dir>

Reads <work>/report-social.json and the bg/ (text hidden), audit/ (cards at 0 deg, overlays off) and mask/
(stickers only) renders. Gates (any failure exits 1):
  A  format: the exact size, RGB without alpha, tagged sRGB
  B  contrast: the headline (starlight and the accent), the tagline and the wordmark text against the lightest
     background pixel inside each glyph box: >= 4.5:1 at full size, >= 3:1 at half size
  C  placement: every sticker <= 50 % over a capture window, its centre >= 0.47 x its width from every paper
     corner (the store rule of 160 px for a 338 px sticker, scaled), inside the edge margin, out of the corner
     squares, the caption zone and the tapes; tapes never touch the caption; every paper corner, tape, wordmark
     and line of text inside the margin; on the story, all of it inside the safe band (platform UI covers the rest)
  T  tape colour: no beige / khaki plaster (Lab chroma >= 45 in the warm hue band 20-110 deg), as the store gate
  D  capture integrity (App Review 2.3.3): each window, re-rendered at 0 deg with every overlay off, equals a
     Lanczos downscale of the raw crop (mean channel difference <= 3), outside the rounded corners, the window
     line and the zone under a stacked card
  E  words: no prices, "free", "#1" / "best", "for kids" wording, pressure or hype words, store badges or calls
     to action in any text on the image
Writes <work>/diag/<name>-<lang>-card<k>.png (each sticker's footprint drawn on the raw crop, for the manual check
that it covers only empty sky or hills) and <work>/preview-*.png (each image at feed / link-card size).
"""
import json, math, os, re, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

opts = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--') and '=' in a)
WORK = opts['work']
REP = json.load(open(os.path.join(WORK, 'report-social.json')))
FAIL = []
STAR = (0xFF, 0xF4, 0xE2)


def fail(msg):
    FAIL.append(msg)
    print('  FAIL', msg)


def lum(rgb):
    def ch(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def ratio(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lightest(im, box):
    a = np.asarray(im.crop(box).convert('RGB')).reshape(-1, 3).astype(float) / 255.0
    lin = np.where(a <= 0.03928, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    L = lin @ np.array([0.2126, 0.7152, 0.0722])
    return tuple(int(v) for v in (a[L.argmax()] * 255).round())


def lab(rgb):
    c = np.asarray(rgb, float) / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    xyz = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]) @ c
    xyz = xyz / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > (6 / 29) ** 3, np.cbrt(xyz), xyz / (3 * (6 / 29) ** 2) + 4 / 29)
    return 116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])


# the store banned list (scrapbook-post.py) plus calls to action and badges, which the social pack must not bake in
BANNED = (r'for kids|para niños|pour enfants|für kinder|para crianças|子ども向け|子供向け|#1|\bbest\b|mejor|meilleur|beste|melhor|最高|No\.1|'
          r'\bfree\b|gratis|gratuit|kostenlos|grátis|無料|\$|€|¥|\bsale\b|oferta|promo|hurry|limited|limitad|limité|begrenzt|jetzt|\bnow\b|'
          r'ahora|maintenant|agora|今すぐ|期間限定|\bkids?\b|children|little ones|your child|niños|enfants|Kinder|crianças|子ども|子供|'
          r'addictive|\bwin\b|winner|loser|timer|countdown|daily|download|descarga|ダウンロード|app store|google play|get it|install|'
          r'out now|available|disponible|配信中|[!?！？]')


def inside(box, x0, y0, x1, y1):
    return box[0] >= x0 and box[1] >= y0 and box[2] <= x1 and box[3] <= y1


previews = []
for r in REP:
    tag = f"{r['name']}-{r['lang']}"
    f, W, H, M = r['file'], r['W'], r['H'], r['margin']
    print(f"== {tag}  {W}x{H}  head {r['headSize']} px  slot {r['slot']}")
    im = Image.open(f)
    # ------------------------------------------------------------------ A: format
    if im.size != (W, H) or im.mode != 'RGB':
        fail(f'{tag}: {im.size} {im.mode}')
    sp = subprocess.run(['sips', '-g', 'hasAlpha', '-g', 'space', '-g', 'profile', f], capture_output=True, text=True).stdout
    if 'hasAlpha: no' not in sp or 'space: RGB' not in sp or 'sRGB' not in sp:
        fail(f'{tag}: sips says {sp.split(chr(10))[1:]}')
    im = im.convert('RGB')
    # ------------------------------------------------------------------ B: contrast
    bg = Image.open(os.path.join(WORK, 'bg', f'{tag}.png')).convert('RGB')
    half = bg.resize((W // 2, H // 2), Image.LANCZOS)
    contrast = {}
    boxes = [('head', r['caption'][0], [STAR] + ([hexrgb(r['accent'])] if r['hasAccent'] else []))]
    for b, st in zip(r['subs'], r['subTexts']):
        boxes.append(('tagline', b, [hexrgb(st['color'])]))
    for b in r['brand']:
        if b['text']:
            boxes.append(('wordmark', b['text'], [STAR]))
    for label, box, cols in boxes:
        x0, y0, x1, y1 = [int(round(v)) for v in box]
        light = lightest(bg, (x0, y0, x1, y1))
        hl = lightest(half, (x0 // 2, y0 // 2, x1 // 2 + 1, y1 // 2 + 1))
        full = min(ratio(c, light) for c in cols)
        small = min(ratio(c, hl) for c in cols)
        contrast[label] = (round(full, 2), round(small, 2), '#%02x%02x%02x' % light)
        if full < 4.5 or small < 3:
            fail(f'{tag} {label}: contrast {full:.2f} (half size {small:.2f}) on {contrast[label][2]}')
        if not inside((x0, y0, x1, y1), M, M, W - M, H - M):
            fail(f'{tag} {label}: box {box} leaves the {M} px margin')
        if r['safe'] and not (r['safe'][0] <= y0 and y1 <= r['safe'][1]):
            fail(f'{tag} {label}: box {box} leaves the safe band {r["safe"]}')
    for b in r['brand']:
        if not inside(b['box'], M, M, W - M, H - M):
            fail(f"{tag} wordmark {b['box']} leaves the {M} px margin")
        if r['safe'] and not (r['safe'][0] <= b['box'][1] and b['box'][3] <= r['safe'][1]):
            fail(f"{tag} wordmark {b['box']} leaves the safe band")
    # ------------------------------------------------------------------ C: placement
    cz = r['captionZone']
    for s, spec in zip(r['stickers'], r['stickerSpecs']):
        s['w'] = spec['w']
        m = s['margins']
        probs = []
        if s['over'] > 0.50:
            probs.append(f"{s['over']:.0%} over the capture")
        if s['cornerDist'] < 0.47 * s['w']:
            probs.append(f"centre {s['cornerDist']} px from a paper corner (< {0.47 * s['w']:.0f})")
        if min(m['left'], m['right'], m['top'], m['bottom']) < M:
            probs.append(f'margins {m}')
        if s['cornerSquare']:
            probs.append('in a corner square')
        if s['captionZone']:
            probs.append('in the caption zone')
        if s['tapeTouch']:
            probs.append('touches a tape')
        if r['safe'] and not (r['safe'][0] <= s['bbox'][1] and s['bbox'][3] <= r['safe'][1]):
            probs.append(f"bbox {s['bbox']} leaves the safe band")
        for b in r['brand']:
            bb = b['box']
            if s['bbox'][0] < bb[2] and s['bbox'][2] > bb[0] and s['bbox'][1] < bb[3] and s['bbox'][3] > bb[1]:
                probs.append('overlaps the wordmark')
        for b in r['subs']:
            if s['bbox'][0] < b[2] and s['bbox'][2] > b[0] and s['bbox'][1] < b[3] and s['bbox'][3] > b[1]:
                probs.append('overlaps the tagline')
        if probs:
            fail(f"{tag} sticker {s['id']}: " + '; '.join(probs))
    corners = r['cardCorners']
    xs, ys = [p[0] for p in corners], [p[1] for p in corners]
    if min(xs) < M or max(xs) > W - M or min(ys) < M or max(ys) > H - M:
        fail(f'{tag}: a card corner leaves the {M} px margin (x {min(xs)}..{max(xs)}, y {min(ys)}..{max(ys)})')
    if r['safe'] and (min(ys) < r['safe'][0] or max(ys) > r['safe'][1]):
        fail(f'{tag}: a card corner leaves the safe band (y {min(ys)}..{max(ys)})')
    tape_rep = []
    arr = np.asarray(im)
    for k, t in enumerate(r['tapes']):
        if t['captionTouch']:
            fail(f'{tag}: tape {k} touches the caption')
        bb = t['bbox']
        if not inside(bb, M - 24, M - 24, W - M + 24, H - M + 24):
            fail(f'{tag}: tape {k} {bb} runs off the page')
        if r['safe'] and bb[1] < r['safe'][0]:
            fail(f'{tag}: tape {k} {bb} leaves the safe band')
        for b in r['brand']:
            q = b['box']
            if bb[0] < q[2] and bb[2] > q[0] and bb[1] < q[3] and bb[3] > q[1]:
                fail(f'{tag}: tape {k} overlaps the wordmark')
        pts = np.array(t.get('nebula') or [], int).reshape(-1, 2)
        pts = pts[(pts[:, 0] >= 0) & (pts[:, 0] < W) & (pts[:, 1] >= 0) & (pts[:, 1] < H)]
        if len(pts) < 20:
            tape_rep.append('on paper')
            continue
        med = np.median(arr[pts[:, 1], pts[:, 0]].astype(float), axis=0)
        L, A, B = lab(med)
        chroma, hue = math.hypot(A, B), math.degrees(math.atan2(B, A)) % 360
        tape_rep.append(f'C{chroma:.0f}/h{hue:.0f}')
        if 20 <= hue <= 110 and chroma < 45:
            fail(f'{tag}: tape {k} reads as plaster (chroma {chroma:.1f} at hue {hue:.0f})')
    # ------------------------------------------------------------------ D: capture integrity
    au = Image.open(os.path.join(WORK, 'audit', f'{tag}.png')).convert('RGB')
    audit = []
    for i, c in enumerate(r['cards']):
        raw = Image.open(c['raw']).convert('RGB')
        w, h, s = c['w'], c['h'], c['scale']
        if s > 1:
            fail(f'{tag} card {i}: scale {s} > 1 (enlarged)')
        win = np.asarray(au.crop((c['x'], c['y'], c['x'] + w, c['y'] + h))).astype(int)
        box = (c['sx'], c['sy'], c['sx'] + w / s, c['sy'] + h / s)
        if box[0] < 0 or box[1] < 0 or box[2] > raw.width + 0.5 or box[3] > raw.height + 0.5:
            fail(f'{tag} card {i}: crop {box} leaves the raw capture')
        ref = raw.crop(tuple(round(v) for v in box))
        ref = np.asarray(ref if s == 1 else ref.resize((w, h), Image.LANCZOS)).astype(int)
        mask = np.ones((h, w), bool)
        rr = c.get('winRadius', 8) + 4
        for (cy, cx) in [(0, 0), (0, w - rr), (h - rr, 0), (h - rr, w - rr)]:
            mask[cy:cy + rr, cx:cx + rr] = False
        mask[:3, :] = mask[-3:, :] = False
        mask[:, :3] = mask[:, -3:] = False
        for later in r['cards'][i + 1:]:
            lb, ll = later.get('border', 36) + 80, later.get('lip', 110) + 80
            lx0, ly0 = later['x'] - lb - c['x'], later['y'] - lb - c['y']
            lx1, ly1 = later['x'] + later['w'] + lb - c['x'], later['y'] + later['h'] + ll - c['y']
            mask[max(0, ly0):max(0, min(h, ly1)), max(0, lx0):max(0, min(w, lx1))] = False
        d = np.abs(win[:ref.shape[0], :ref.shape[1]] - ref)[mask[:ref.shape[0], :ref.shape[1]]]
        ok = (d.max() <= 2) if s == 1 else (d.mean() <= 3)
        audit.append(f"card{i} s{s} mean {d.mean():.2f} {'ok' if ok else 'FAIL'}")
        if not ok:
            fail(f'{tag} card {i}: capture differs from the raw (max {d.max()}, mean {d.mean():.2f})')
    # ------------------------------------------------------------------ E: words
    for t in [r['head']] + [s['text'] for s in r['subTexts']] + r['brandText']:
        if re.search(BANNED, t.replace('*', ''), re.I):
            fail(f'{tag}: banned or rule word in {t!r}')
    # ------------------------------------------------------------------ diag: sticker footprints on the raw
    mpath = os.path.join(WORK, 'mask', f'{tag}.png')
    os.makedirs(os.path.join(WORK, 'diag'), exist_ok=True)
    if os.path.exists(mpath):
        ma = np.asarray(Image.open(mpath).convert('RGBA'))[:, :, 3] > 128
        yy, xx = np.nonzero(ma)
        for i, c in enumerate(r['cards']):
            raw = Image.open(c['raw']).convert('RGB')
            cx, cy = c['x'] + c['w'] / 2, c['y'] + c['h'] / 2
            t = -math.radians(c.get('rot', 0))
            u = (xx - cx) * math.cos(t) - (yy - cy) * math.sin(t)
            v = (xx - cx) * math.sin(t) + (yy - cy) * math.cos(t)
            ins = (np.abs(u) <= c['w'] / 2) & (np.abs(v) <= c['h'] / 2)
            if not ins.any():
                continue
            rx = (c['sx'] + (u[ins] + c['w'] / 2) / c['scale']).astype(int)
            ry = (c['sy'] + (v[ins] + c['h'] / 2) / c['scale']).astype(int)
            ov = np.zeros((raw.height, raw.width), bool)
            ok = (rx >= 0) & (rx < raw.width) & (ry >= 0) & (ry < raw.height)
            ov[ry[ok], rx[ok]] = True
            ov = np.asarray(Image.fromarray(ov.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(7))) > 0
            a = np.asarray(raw).astype(float)
            a[ov] = a[ov] * 0.45 + np.array([255, 40, 90]) * 0.55
            dg = Image.fromarray(a.astype(np.uint8))
            crop = (round(c['sx']), round(c['sy']), round(c['sx'] + c['w'] / c['scale']), round(c['sy'] + c['h'] / c['scale']))
            ImageDraw.Draw(dg).rectangle(crop, outline=(80, 255, 160), width=6)
            dg.crop(crop).save(os.path.join(WORK, 'diag', f'{tag}-card{i}.png'))
    print(f"  contrast {contrast}")
    print(f"  stickers {', '.join(f'{s['id']} {s['over']:.0%} corner {s['cornerDist']} margins {s['margins']}' for s in r['stickers'])}")
    print(f"  tapes {', '.join(tape_rep)}  audit {'; '.join(audit)}")
    previews.append((tag, im))

# ---------------------------------------------------------------------- previews at feed / link-card size
for tag, im in previews:
    W, H = im.size
    if W == 1200:  # a link card is shown at about 600 x 315, often smaller
        sizes = [(600, 315), (300, 158)]
    elif H > W:  # a story on a phone, and as a grid thumbnail
        sizes = [(360, 640), (180, 320)]
    else:  # a feed post on a phone, and as a grid thumbnail
        sizes = [(400, 400), (200, 200)]
    row = Image.new('RGB', (sum(s[0] for s in sizes) + 24 * (len(sizes) + 1), max(s[1] for s in sizes) + 48), (255, 255, 255))
    x = 24
    for s in sizes:
        row.paste(im.resize(s, Image.LANCZOS), (x, 24))
        x += s[0] + 24
    row.save(os.path.join(WORK, f'preview-{tag}.png'))

print('SOCIAL GATES', 'PASS' if not FAIL else f'FAIL ({len(FAIL)})')
sys.exit(1 if FAIL else 0)
