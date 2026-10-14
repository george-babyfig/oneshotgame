#!/usr/bin/env python3
"""Comet Garden store art v2: the gates, the contact sheet and the search row (run by scrapbook.mjs).

    python3 store/tools/scrapbook-post.py --work=<work dir> --out=<screenshots-v2 dir> en [es fr de pt ja]

Gates (any failure exits 1):
  A  every file is 1320x2868 RGB without alpha, tagged sRGB
  B  caption contrast: starlight and the slot accent against the lightest background pixel inside the glyph box
     (caption-hidden render), >= 4.5:1 at full size and >= 3:1 in a 230 px tile
  C  stickers: <= 50 % of the opaque area over a capture window; >= 160 px from every card corner; 64 px side and
     60 px bottom margins; nothing in the 96 px corner squares or the caption zone; never touching a tape.
     Tapes never touch the caption. Paper tops at y >= 480 (before tilt) and paper bottoms (after tilt) <= 2808.
  T  tape colour: the median pixel of each tape where it lies over the open nebula (off every card) must read as
     coloured washi, never as a beige / khaki sticking plaster (spec 2.4): Lab chroma >= 45 whenever its hue is in
     the warm band (Lab hue 20-110 deg, peach to khaki); every tape's chroma and hue go to the report
  D  capture integrity (App Review 2.3.3): each card window, re-rendered at 0 deg with every overlay off, equals the
     raw crop (scale 1: max channel difference <= 2) or a Lanczos downscale of it (mean <= 3), outside the rounded
     corners, the 2 px window line and the zone under a stacked card (its border plus 120 px of paper shadow)
  E  caption words: no ! or ?, nothing from the store banned list, 2-4 words (JA <= 12 characters), one accent
Also writes diag/<lang>-<id>-card<k>.png: the raw crop with each sticker's footprint drawn over it, for the manual
check that stickers cover only empty sky or hills (spec 6.2 item 2).
"""
import json, math, os, re, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
POSTER = os.path.join(ROOT, 'store', 'preview', 'poster-en.png')
opts = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--') and '=' in a)
LANGS = [a for a in sys.argv[1:] if not a.startswith('--')] or ['en']
WORK, OUT = opts['work'], opts['out']
CAPS = json.load(open(os.path.join(HERE, 'scrapbook-captions.json')))
FAIL = []


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


def colourfulness(im):
    a = np.asarray(im.convert('RGB').resize((230, 500))).astype(float)
    rg = a[..., 0] - a[..., 1]
    yb = 0.5 * (a[..., 0] + a[..., 1]) - a[..., 2]
    return math.sqrt(rg.std() ** 2 + yb.std() ** 2) + 0.3 * math.sqrt(rg.mean() ** 2 + yb.mean() ** 2)


def font(size, bold=True, ja=False):
    paths = ['/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/System/Library/Fonts/Helvetica.ttc']
    if ja:
        paths = ['/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc', '/System/Library/Fonts/ヒラギノ丸ゴ ProN W4.ttc'] + paths
    for p in paths:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def subtitle(lang):
    """The App Store subtitle of the locale's listing (store/listing[.<lang>].md), as the search row shows it."""
    path = os.path.join(ROOT, 'store', 'listing.md' if lang == 'en' else f'listing.{lang}.md')
    try:
        m = re.search(r'^\*\*Subtitle \(30\):\*\*\s*(.+?)\s*$', open(path, encoding='utf-8').read(), re.M)
        return m.group(1) if m else 'Fling comets, grow tiny worlds'
    except OSError:
        return 'Fling comets, grow tiny worlds'


STAR = hexrgb('#fff4e2')


def lab(rgb):
    """sRGB (0-255) -> CIE Lab (D65)."""
    c = np.asarray(rgb, float) / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    xyz = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]) @ c
    xyz = xyz / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > (6 / 29) ** 3, np.cbrt(xyz), xyz / (3 * (6 / 29) ** 2) + 4 / 29)
    return 116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])


TAPE_MIN_CHROMA = 45
TAPE_WARM = (20, 110)  # Lab hue band where a dull tape reads as beige / khaki / peach plaster

# ---------------------------------------------------------------- E: caption words
banned = r'for kids|para niños|pour enfants|für kinder|para crianças|子ども向け|子供向け|#1|\bbest\b|mejor|meilleur|beste|melhor|最高|No\.1|\bfree\b|gratis|gratuit|kostenlos|grátis|無料|\$|€|¥|\bsale\b|oferta|promo|hurry|limited|limitad|limité|begrenzt|jetzt|\bnow\b|ahora|maintenant|agora|今すぐ|期間限定'
extra = r'\bkids?\b|children|little ones|your child|niños|enfants|Kinder|crianças|子ども|子供|addictive|\bwin\b|winner|loser|timer|countdown|daily|[!?！？]'
for lang in ['en', 'es', 'fr', 'de', 'pt', 'ja']:
    for sid, t in zip(CAPS['ids'], CAPS[lang]):
        plain = t.replace('*', '')
        errs = []
        if re.search(banned, plain, re.I): errs.append('banned word')
        if re.search(extra, plain, re.I): errs.append('rule word or punctuation')
        if t.count('*') != 2: errs.append('needs exactly one *accent*')
        if lang == 'ja':
            if len(plain) > 12: errs.append(f'{len(plain)} > 12 characters')
        elif not 2 <= len(plain.split()) <= 4:
            errs.append(f'{len(plain.split())} words')
        if errs:
            fail(f'caption {lang} {sid} {plain!r}: ' + ', '.join(errs))
print('CAPTIONS', 'PASS' if not FAIL else 'FAIL')

summary = {}
for lang in LANGS:
    rep = json.load(open(os.path.join(WORK, f'report-{lang}.json')))
    print(f'== {lang}  caption set {rep["size"]} px (widest: shot {rep["widest"]})')
    res = {'size': rep['size'], 'shots': {}}
    os.makedirs(os.path.join(WORK, 'diag'), exist_ok=True)
    for sid, info in rep['shots'].items():
        f = info['file']
        im = Image.open(f)
        # ---------------------------------------------------------------- A: format
        if im.size != (1320, 2868) or im.mode != 'RGB':
            fail(f'{lang} {sid}: {im.size} {im.mode}')
        sp = subprocess.run(['sips', '-g', 'hasAlpha', '-g', 'space', '-g', 'profile', f], capture_output=True, text=True).stdout
        if 'hasAlpha: no' not in sp or 'space: RGB' not in sp or 'sRGB' not in sp:
            fail(f'{lang} {sid}: sips says {sp.split(chr(10))[1:]}')
        im = im.convert('RGB')
        # ---------------------------------------------------------------- B: contrast
        bg = Image.open(os.path.join(WORK, 'bg', f'{lang}-{sid}.png')).convert('RGB')
        x0, y0, x1, y1 = info['caption'][0]
        light = lightest(bg, (x0, y0, x1, y1))
        k = 230 / 1320
        small = bg.resize((230, 500), Image.LANCZOS)
        slight = lightest(small, (int(x0 * k), int(y0 * k), int(x1 * k) + 1, int(y1 * k) + 1))
        acc = hexrgb(info['accent'])
        star_full, acc_full = ratio(STAR, light), ratio(acc, light)
        thumb = min(ratio(STAR, slight), ratio(acc, slight))
        if star_full < 4.5 or acc_full < 4.5 or thumb < 3:
            fail(f'{lang} {sid}: contrast star {star_full:.2f} accent {acc_full:.2f} tile {thumb:.2f}')
        if not (130 <= y0 and y1 <= 400 and 72 <= x0 and x1 <= 1248):
            fail(f'{lang} {sid}: caption glyph box {info["caption"][0]} leaves the caption zone')
        # ---------------------------------------------------------------- C: stickers, tapes, chip
        for s in info['stickers']:
            m = s['margins']
            probs = []
            if s['over'] > 0.50: probs.append(f"{s['over']:.0%} over the capture")
            # the sticker's centre (its anchor) keeps 160 px from every card corner: no corner "peek" placements
            if s['cornerDist'] < 160: probs.append(f"centre {s['cornerDist']} px from a card corner")
            if m['left'] < 64 or m['right'] < 64 or m['bottom'] < 60: probs.append(f'margins {m}')
            if s['cornerSquare']: probs.append('in a corner square')
            if s['captionZone'] or m['top'] < 400: probs.append('in the caption zone')
            if s['tapeTouch']: probs.append('touches a tape')
            if probs:
                fail(f"{lang} {sid} sticker {s['id']}: " + '; '.join(probs))
        tape_rep = []
        for k, t in enumerate(info['tapes']):
            if t['captionTouch']:
                fail(f'{lang} {sid}: a tape touches the caption')
            pts = np.array(t.get('nebula') or [], int).reshape(-1, 2)
            pts = pts[(pts[:, 0] >= 0) & (pts[:, 0] < 1320) & (pts[:, 1] >= 0) & (pts[:, 1] < 2868)]
            if len(pts) < 20:
                fail(f'{lang} {sid}: tape {k} has only {len(pts)} sample points over the nebula')
                continue
            arr = np.asarray(im)
            med = np.median(arr[pts[:, 1], pts[:, 0]].astype(float), axis=0)
            L, A, B = lab(med)
            chroma, hue = math.hypot(A, B), math.degrees(math.atan2(B, A)) % 360
            tape_rep.append({'median': '#%02x%02x%02x' % tuple(int(round(v)) for v in med), 'L': round(L, 1), 'chroma': round(chroma, 1), 'hue': round(hue)})
            if TAPE_WARM[0] <= hue <= TAPE_WARM[1] and chroma < TAPE_MIN_CHROMA:
                fail(f'{lang} {sid}: tape {k} reads as plaster: median {tape_rep[-1]["median"]} chroma {chroma:.1f} < {TAPE_MIN_CHROMA} at hue {hue:.0f}')
        for i, c in enumerate(info['cards']):
            top = c['y'] - c.get('border', 36)
            if top < 480:
                fail(f'{lang} {sid} card {i}: paper top at y {top} (< 480)')
        corners = info.get('cardCorners', [])
        if corners and max(p[1] for p in corners) > 2808:
            fail(f'{lang} {sid}: a card bottom reaches y {max(p[1] for p in corners)} (> 2808)')
        for c in info.get('chips', []):
            if c[0] < 64 or c[2] > 1256 or c[3] > 2808:
                fail(f'{lang} {sid}: chip {c} leaves the margins')
        # ---------------------------------------------------------------- D: capture integrity
        au = Image.open(os.path.join(WORK, 'audit', f'{lang}-{sid}.png')).convert('RGB')
        audit = []
        for i, c in enumerate(info['cards']):
            raw = Image.open(c['raw']).convert('RGB')
            w, h, s = c['w'], c['h'], c['scale']
            win = np.asarray(au.crop((c['x'], c['y'], c['x'] + w, c['y'] + h))).astype(int)
            box = (c['sx'], c['sy'], c['sx'] + w / s, c['sy'] + h / s)
            if s == 1:
                ref = np.asarray(raw.crop(tuple(round(v) for v in box))).astype(int)
            else:
                ref = np.asarray(raw.crop(tuple(round(v) for v in box)).resize((w, h), Image.LANCZOS)).astype(int)
            mask = np.ones((h, w), bool)
            r = c.get('winRadius', 8) + 4
            for (cy, cx) in [(0, 0), (0, w - r), (h - r, 0), (h - r, w - r)]:
                mask[cy:cy + r, cx:cx + r] = False
            mask[:3, :] = mask[-3:, :] = False
            mask[:, :3] = mask[:, -3:] = False
            for later in info['cards'][i + 1:]:
                # the stacked card's paper (border, bottom lip) plus 120 px of its shadow
                lb, ll = later.get('border', 36) + 120, later.get('lip', 110) + 120
                lx0, ly0 = later['x'] - lb - c['x'], later['y'] - lb - c['y']
                lx1, ly1 = later['x'] + later['w'] + lb - c['x'], later['y'] + later['h'] + ll - c['y']
                mask[max(0, ly0):max(0, min(h, ly1)), max(0, lx0):max(0, min(w, lx1))] = False
            d = np.abs(win[:ref.shape[0], :ref.shape[1]] - ref)[mask[:ref.shape[0], :ref.shape[1]]]
            ok = (d.max() <= 2) if s == 1 else (d.mean() <= 3)
            audit.append({'card': i, 'scale': s, 'max': int(d.max()), 'mean': round(float(d.mean()), 2), 'pass': bool(ok)})
            if not ok:
                fail(f'{lang} {sid} card {i}: capture differs from the raw (max {d.max()}, mean {d.mean():.2f})')
        # ---------------------------------------------------------------- diag: sticker footprints on the raw
        mpath = os.path.join(WORK, 'mask', f'{lang}-{sid}.png')
        if os.path.exists(mpath) and info['stickers']:
            ma = np.asarray(Image.open(mpath).convert('RGBA'))[:, :, 3] > 128
            ys, xs = np.nonzero(ma)
            for i, c in enumerate(info['cards']):
                raw = Image.open(c['raw']).convert('RGB')
                cx, cy = c['x'] + c['w'] / 2, c['y'] + c['h'] / 2
                t = -math.radians(c.get('rot', 0))
                u = (xs - cx) * math.cos(t) - (ys - cy) * math.sin(t)
                v = (xs - cx) * math.sin(t) + (ys - cy) * math.cos(t)
                inside = (np.abs(u) <= c['w'] / 2) & (np.abs(v) <= c['h'] / 2)
                if not inside.any():
                    continue
                rx = (c['sx'] + (u[inside] + c['w'] / 2) / c['scale']).astype(int)
                ry = (c['sy'] + (v[inside] + c['h'] / 2) / c['scale']).astype(int)
                ov = np.zeros((raw.height, raw.width), bool)
                ok = (rx >= 0) & (rx < raw.width) & (ry >= 0) & (ry < raw.height)
                ov[ry[ok], rx[ok]] = True
                ov = np.asarray(Image.fromarray(ov.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5))) > 0
                a = np.asarray(raw).astype(float)
                a[ov] = a[ov] * 0.45 + np.array([255, 40, 90]) * 0.55
                diag = Image.fromarray(a.astype(np.uint8))
                d = ImageDraw.Draw(diag)
                crop = (round(c['sx']), round(c['sy']), round(c['sx'] + c['w'] / c['scale']), round(c['sy'] + c['h'] / c['scale']))
                d.rectangle(crop, outline=(80, 255, 160), width=6)
                diag.crop(crop).save(os.path.join(WORK, 'diag', f'{lang}-{sid}-card{i}.png'))
        res['shots'][sid] = {
            'file': os.path.relpath(f, ROOT), 'slot': info['slot'], 'accent': info['accent'], 'caption_box': info['caption'][0], 'lightest_bg': '#%02x%02x%02x' % light,
            'star': round(star_full, 2), 'accent_ratio': round(acc_full, 2), 'tile_min': round(thumb, 2),
            'stickers': {s['id']: {'over': s['over'], 'corner': s['cornerDist'], 'margins': s['margins']} for s in info['stickers']},
            'audit': audit, 'tapes': tape_rep, 'mean_lum': round(float(np.asarray(im.convert('L').resize((230, 500))).mean()), 1), 'colourfulness': round(colourfulness(im), 1),
        }
        st = res['shots'][sid]
        print(f"  {info['n']} {sid:>2} {st['slot']:<13} star {st['star']:>5} accent {st['accent_ratio']:>5} tile {st['tile_min']:>5}  lum {st['mean_lum']:>5} colour {st['colourfulness']:>5}  "
              f"audit {'/'.join('ok' if x['pass'] else 'FAIL' for x in audit)}  tape {', '.join(f"C{x['chroma']:.0f}/h{x['hue']}" for x in tape_rep) or '-'}  stickers {', '.join(f'{k} {v['over']:.0%} c{v['corner']}' for k, v in st['stickers'].items()) or '-'}")
    summary[lang] = res

    # ---------------------------------------------------------------- contact sheet (upload order)
    files = [rep['shots'][s]['file'] for s in rep['order'] if s in rep['shots']]
    tw, th, gap, pad, head = 330, 717, 16, 24, 64
    sheet = Image.new('RGB', (pad * 2 + len(files) * tw + (len(files) - 1) * gap, pad * 2 + head + th + 40), (22, 20, 58))
    d = ImageDraw.Draw(sheet)
    title = f'Comet Garden store screenshots v2 [{lang}]  upload order ' + (' (App Preview is tile 1)' if lang == 'en' else '') + f'  caption {rep["size"]} px'
    d.text((pad, pad), title, fill=(240, 236, 255), font=font(26))
    for i, fp in enumerate(files):
        t = Image.open(fp).convert('RGB').resize((tw, th), Image.LANCZOS)
        x = pad + i * (tw + gap)
        sheet.paste(t, (x, pad + head))
        d.text((x, pad + head + th + 8), os.path.basename(fp), fill=(190, 184, 230), font=font(18))
    sheet.save(os.path.join(OUT, f'contact-sheet-{lang}.png'))

    # ---------------------------------------------------------------- search row: the first three tiles at 230x500
    tiles = [Image.open(fp).convert('RGB') for fp in files[:3]]
    if lang == 'en':
        tiles = [Image.open(POSTER).convert('RGB')] + tiles[:2]
    for mode, bgc, fg, dst in (('light', (255, 255, 255), (20, 20, 20), os.path.join(OUT, f'search-row-{lang}.png')),
                               ('dark', (0, 0, 0), (235, 235, 235), os.path.join(WORK, f'search-row-{lang}-dark.png'))):
        tw, th, gap, pad = 230, 500, 12, 24
        row = Image.new('RGB', (pad * 2 + 3 * tw + 2 * gap, th + pad * 2 + 88), bgc)
        d = ImageDraw.Draw(row)
        icon = Image.open(os.path.join(ROOT, 'site', 'img', 'icon-512.png')).convert('RGB').resize((64, 64), Image.LANCZOS)
        im_mask = Image.new('L', (64, 64), 0)
        ImageDraw.Draw(im_mask).rounded_rectangle((0, 0, 63, 63), 15, fill=255)
        row.paste(icon, (pad, pad), im_mask)
        d.text((pad + 80, pad + 6), 'Comet Garden', fill=fg, font=font(24))
        d.text((pad + 80, pad + 38), subtitle(lang), fill=(120, 120, 128) if mode == 'light' else (160, 160, 168), font=font(17, ja=lang == 'ja'))
        for i, t in enumerate(tiles):
            tt = t.resize((tw, th), Image.LANCZOS)
            m = Image.new('L', (tw, th), 0)
            ImageDraw.Draw(m).rounded_rectangle((0, 0, tw - 1, th - 1), 22, fill=255)
            row.paste(tt, (pad + i * (tw + gap), pad + 88), m)
        row.save(dst)

json.dump(summary, open(os.path.join(WORK, 'post-report.json'), 'w'), indent=1)
print('GATES', 'PASS' if not FAIL else f'FAIL ({len(FAIL)})')
sys.exit(1 if FAIL else 0)
