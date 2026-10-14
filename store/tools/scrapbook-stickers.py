#!/usr/bin/env python3
"""Comet Garden store art v2: die-cut stickers from the game's own padded renders (production spec section 6.1).

    python3 store/tools/scrapbook-stickers.py --src=<padded renders> --out=<sticker dir> [name ...]

The creature / Keeper / object pixels are copied as they are (downscale only). The recipe only
  * drops the baked contact shadow and rarity glow (alpha < 110),
  * closes concavities by 12 px and adds a 14 px paper backing (#fffbf4; #efeaff for pale species) with a
    hairline cut line rgb(176,166,214) at 55 % hugging the art,
  * folds back one peeled corner (12-13 % of the width): for a sticker stuck across a side border the bottom corner
    over the card (spec section 7: shot 1 "peel down-right", shot 3 "peel down-left"; section 6.1's "away from
    the card" contradicts it, and folding over the card also keeps more of the sticker off the capture), for the
    Lifebook trio the outer bottom corners, for the Keeper the corners the reference build used,
  * exports at 2x the display width (the composer places it at 1x). No ground or contact shadow: the lift
    shadow is added by the composer, because stickers are stuck on the page, not standing in the scene.
Sticker names, sources, display widths (including the backing) and peel sides come from STICKERS below; the
composer (scrapbook.mjs) reads <out>/<name>.png.
"""
import math, os, sys
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

# name -> (source render, display width in canvas px incl. the backing, peel side or None)
# peel side = direction the peeled corner points: 45 = down-right, 135 = down-left
STICKERS = {
    # gameplay residents, stuck across a side border of the card (338-344 px)
    'bunny-happy':    ('creature-bunny-happy',    338, 45),    # shot 1 (non-EN), left border: peel down-right
    'frog-happy':     ('creature-frog-happy',     338, 45),    # shot 1 fallback
    'deer-happy':     ('creature-deer-happy',     338, 45),    # shot 2, left border of the after card
    'octopus-wave':   ('creature-octopus-wave',   344, 135),   # shot 3, right border: peel down-left
    'flamingo-wave':  ('creature-flamingo-wave',  344, 135),   # shot 3 (if the flamingo arrives), right border
    # Lifebook trio, stuck across the card's bottom border (388-408 px)
    'crab-happy':     ('creature-crab-happy',     388, 135),
    'penguin-happy':  ('creature-penguin-happy',  408, None),
    'parrot-wave':    ('creature-parrot-wave',    388, 45),
    # the Keeper anchor on screen shots (258-278 px wide)
    'keeper-lean':    ('keeper-lean',             278, 135),
    'keeper-idle':    ('keeper-idle',             258, 45),
    # objects: only inside the recipe chip (drawn 116 px tall there)
    'object-rock':    ('object-rock',             128, None),
    'object-ice':     ('object-ice',              128, None),
    'object-seed':    ('object-seed',             128, None),
    'object-storm':   ('object-storm',            128, None),
    'object-magma':   ('object-magma',            128, None),
}
PALE = {'bunny', 'goat', 'llama', 'unicorn', 'seal'}

OUTLINE_PX = 14      # paper backing as displayed on the canvas
SMOOTH_PX = 12       # closing radius (fills gaps between ears, tentacles...) as displayed
PAD = 200            # extra source pixels so the backing never meets the edge
PAPER = np.array([255, 251, 244], np.float32)
PAPER_PALE = np.array([239, 234, 255], np.float32)
CUT = np.array([176, 166, 214], np.float32)


def disk_offsets(r, step=2.0):
    offs = set()
    rr = r
    while rr > 0:
        n = max(8, int(2 * math.pi * rr / step))
        for i in range(n):
            a = 2 * math.pi * i / n
            offs.add((int(round(rr * math.cos(a))), int(round(rr * math.sin(a)))))
        rr -= step * 1.5
    offs.add((0, 0))
    return offs


def dilate(mask, r):
    if r <= 0:
        return mask.copy()
    h, w = mask.shape
    out = mask.copy()
    for dx, dy in disk_offsets(r):
        sx0, sx1 = max(0, -dx), min(w, w - dx)
        sy0, sy1 = max(0, -dy), min(h, h - dy)
        out[sy0 + dy:sy1 + dy, sx0 + dx:sx1 + dx] |= mask[sy0:sy1, sx0:sx1]
    return out


def erode(mask, r):
    return ~dilate(~mask, r)


def soft(mask, blur):
    im = Image.fromarray((mask * 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(im).astype(np.float32) / 255.0


def fill_holes(mask):
    im = Image.fromarray(np.where(mask, 255, 0).astype(np.uint8), 'L').copy()  # a writable copy (fromarray can share a read-only buffer)
    ImageDraw.floodfill(im, (0, 0), 128)
    return np.asarray(im) != 128


def make(src_dir, out_dir, name, asset, total_w, peel):
    src = Image.open(os.path.join(src_dir, asset + '.png')).convert('RGBA')
    # work at about 2.4x the export size: plenty for the morphology, and the final step only downsizes
    body0 = np.asarray(src)[:, :, 3] >= 110
    ys, xs = np.nonzero(body0)
    bw0 = xs.max() - xs.min() + 1
    work = (total_w - 2 * OUTLINE_PX) * 2.4 / bw0
    if work < 1:
        src = src.resize((round(src.width * work), round(src.height * work)), Image.LANCZOS)
    a = np.asarray(src).astype(np.float32)
    h0, w0 = a.shape[:2]
    big = np.zeros((h0 + 2 * PAD, w0 + 2 * PAD, 4), np.float32)
    big[PAD:PAD + h0, PAD:PAD + w0] = a
    alpha = big[:, :, 3]
    body = alpha >= 110                      # drops the baked contact shadow and rarity glow
    ys, xs = np.nonzero(body)
    bw = xs.max() - xs.min() + 1
    scale = (total_w - 2 * OUTLINE_PX) / bw  # display px per working px
    o = OUTLINE_PX / scale
    sm = SMOOTH_PX / scale
    shape = fill_holes(erode(dilate(body, o + sm), sm))
    shape_a = soft(shape, 0.55 / scale)
    # the art keeps its own soft edge; the shadow / glow pixels beyond it are dropped
    art_a = np.where(alpha >= 110, alpha / 255.0, np.clip((alpha - 60) / 50.0, 0, 1) * (alpha / 255.0))
    art_a = np.where(dilate(body, 2), art_a, 0)
    species = asset.split('-')[1] if asset.startswith('creature-') else ''
    paper = PAPER_PALE if species in PALE else PAPER
    rgb = big[:, :, :3]
    out_rgb = rgb * art_a[..., None] + paper * (1 - art_a[..., None])
    out_a = np.maximum(shape_a, art_a)
    # a faint inner rim, so the backing reads as thick paper, not a glow
    rim = np.clip(soft(shape, 3.0 / scale) - soft(erode(shape, 2.2 / scale), 1.0 / scale), 0, 1) * (1 - art_a)
    out_rgb = out_rgb * (1 - 0.10 * rim[..., None]) + np.array([200, 190, 230], np.float32) * (0.10 * rim[..., None])
    # hairline cut line hugging the art (pale creatures keep their silhouette on the paper)
    kl = np.clip(soft(dilate(body, 2.2 / scale), 0.8 / scale) - soft(body, 0.8 / scale), 0, 1) * (1 - art_a)
    out_rgb = out_rgb * (1 - 0.55 * kl[..., None]) + CUT * (0.55 * kl[..., None])

    if peel is not None:
        n = np.array([math.cos(math.radians(peel)), math.sin(math.radians(peel))])
        yy, xx = np.mgrid[0:shape.shape[0], 0:shape.shape[1]].astype(np.float32)
        proj = xx * n[0] + yy * n[1]
        ext = proj[shape].max()
        depth = 0.125 * (bw + 2 * o)
        d = proj - (ext - depth)                         # > 0 beyond the fold line
        keep = np.clip(0.5 - d, 0, 1)
        qx = np.clip(np.round(xx - 2 * d * n[0]).astype(int), 0, shape.shape[1] - 1)
        qy = np.clip(np.round(yy - 2 * d * n[1]).astype(int), 0, shape.shape[0] - 1)
        flap = np.clip(shape_a[qy, qx] * (d < 0) * (d > -depth - 2), 0, 1)
        base_a = out_a * keep
        sh = np.asarray(Image.fromarray((flap * 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(10 / scale))).astype(np.float32) / 255.0
        shift = int(round(6 / scale))
        sh = np.roll(np.roll(sh, int(round(-n[1] * shift)), 0), int(round(-n[0] * shift)), 1) * 0.40
        t = np.clip(-d / max(depth, 1), 0, 1)
        back = np.stack([224 + 28 * t, 219 + 30 * t, 238 + 14 * t], -1)
        rgb2 = out_rgb * base_a[..., None] * (1 - sh[..., None]) + np.array([20, 16, 60], np.float32) * sh[..., None]
        a2 = base_a + sh * (1 - base_a)
        rgb2 = np.where(a2[..., None] > 0, rgb2 / np.maximum(a2[..., None], 1e-6), 0)
        rgb3 = back * flap[..., None] + rgb2 * a2[..., None] * (1 - flap[..., None])
        a3 = flap + a2 * (1 - flap)
        rgb3 = np.where(a3[..., None] > 0, rgb3 / np.maximum(a3[..., None], 1e-6), 0)
        fold = np.exp(-(d / (1.4 / scale)) ** 2) * flap
        out_rgb = rgb3 * (1 - 0.5 * fold[..., None]) + 255 * 0.5 * fold[..., None]
        out_a = a3

    img = np.dstack([np.clip(out_rgb, 0, 255), np.clip(out_a * 255, 0, 255)]).astype(np.uint8)
    im = Image.fromarray(img, 'RGBA')
    im = im.crop(im.getbbox())
    th = round(im.height * total_w / im.width)
    im = im.resize((total_w * 2, th * 2), Image.LANCZOS)   # 2x the display size
    os.makedirs(out_dir, exist_ok=True)
    im.save(os.path.join(out_dir, name + '.png'))
    return name, total_w, th


if __name__ == '__main__':
    opts = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--'))
    only = [a for a in sys.argv[1:] if not a.startswith('--')]
    src_dir, out_dir = opts['src'], opts['out']
    for k, (asset, w, peel) in STICKERS.items():
        if only and k not in only:
            continue
        print(make(src_dir, out_dir, k, asset, w, peel))
