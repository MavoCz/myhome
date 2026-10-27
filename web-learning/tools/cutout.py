#!/usr/bin/env python3
"""Cut a generated character out of its plain background.

Usage: cutout.py input.png output.png [--threshold 30] [--max-size 640]

Generate on a solid bright green background ("flat solid bright green background, #00ff00 chroma
key green"): the background hue is keyed out, its shadows included, and white parts of the
character (a penguin's belly) are safe. A plain white or light background also works, but then
everything light that touches the border is removed, so it suits characters without white parts.
The result is cropped to the character and scaled so its longer side is at most --max-size pixels.

Needs Pillow, numpy and scipy (the ComfyUI virtualenv has them).
"""
import argparse

import numpy as np
from PIL import Image
from scipy import ndimage


def keep_main_parts(alpha: np.ndarray) -> np.ndarray:
    """Drop tiny islands (shadow crumbs, specks of texture) and keep the character itself."""
    parts, count = ndimage.label(alpha > 0.5)
    if count > 1:
        sizes = ndimage.sum(np.ones_like(parts), parts, index=range(1, count + 1))
        keep = [i + 1 for i, s in enumerate(sizes) if s >= sizes.max() * 0.01]
        solid = ndimage.binary_dilation(np.isin(parts, keep), iterations=3)
        alpha = np.where(solid, alpha, 0)
    return alpha


def key_out(rgb: np.ndarray, bg: np.ndarray) -> Image.Image:
    """Chroma key: transparency follows how much of the background hue a pixel carries,
    so its shadows (darker shades of the same hue) disappear too and edges stay soft.
    The key's strong channels are one (green, blue) or two (magenta = red + blue)."""
    high = bg > bg.max() / 2
    spill = rgb[..., high].min(axis=2) - rgb[..., ~high].max(axis=2)
    hue_share = spill / (rgb.max(axis=2) + 1)
    bg_share = (bg[high].min() - bg[~high].max()) / (bg.max() + 1)
    t = hue_share / bg_share
    alpha = np.clip((0.7 - t) / 0.45, 0, 1)
    alpha = keep_main_parts(alpha)
    # take the key colour's cast off the cut edge
    out = rgb.copy()
    tinted = t > 0.05
    out[..., high] -= (np.maximum(spill - 4, 0) * tinted)[..., None]
    return Image.fromarray(np.dstack([out, alpha * 255]).clip(0, 255).astype(np.uint8), "RGBA")


def cut(src: Image.Image, threshold: float) -> Image.Image:
    rgb = np.asarray(src.convert("RGB")).astype(np.float32)
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    if bg.max() - bg.min() > 60:
        return key_out(rgb, bg)
    # how far each pixel is from the paper colour, in the channel that differs most
    dist = np.abs(rgb - bg).max(axis=2)

    # paper-cutout art casts light grey shadows next to the figure; they are colourless and bright
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    luma = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    near_bg = (dist < threshold) | ((chroma < 34) & (luma > 150))
    labels, _ = ndimage.label(near_bg)
    edge_labels = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    background = np.isin(labels, edge_labels[edge_labels > 0])

    # one more pixel off the outline takes the last of the shadow fringe with it
    background = ndimage.binary_dilation(background, iterations=1)
    alpha = (~background).astype(np.float32)
    # soften the cut edge so the outline is not jagged
    ring = ndimage.binary_dilation(~background, iterations=2) & background
    alpha[ring] = np.clip(dist[ring] / threshold, 0, 1) * 0.9
    alpha = ndimage.gaussian_filter(alpha, 0.6)
    alpha[~ndimage.binary_dilation(~background, iterations=3)] = 0
    alpha = keep_main_parts(alpha)

    out = np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--threshold", type=float, default=30)
    ap.add_argument("--max-size", type=int, default=640)
    args = ap.parse_args()

    img = cut(Image.open(args.input), args.threshold)
    box = img.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if not box:
        raise SystemExit("nothing left after removing the background; try a lower --threshold")
    pad = 6
    img = img.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(img.width, box[2] + pad), min(img.height, box[3] + pad)))
    scale = min(1.0, args.max_size / max(img.size))
    if scale < 1:
        img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    img.save(args.output, optimize=True)
    print(f"{args.output} {img.width}x{img.height}")


if __name__ == "__main__":
    main()
