#!/usr/bin/env python3
"""Picture Study drop targets: one outline per labelled structure, per picture.

For every labelled picture (each plain picture, each MT picture variant, each Anatomy view frame) the
structure under each label's leader-line end (anchor) is traced from the picture itself: the pixels
connected to the anchor that share its colour (lightness counts less, so shading stays in), not the
background. The outline is saved as a polygon in picture percent (0-100 on both axes), so it scales
with the picture. Too small or runaway traces fall back to an ellipse around the anchor.
Hand-drawn outlines in hit-overrides.json (same layout, plus "exact": true) replace traced ones.

Output: <study dir>/hit-regions.json = {"<picture src>": {"<label id>": {"p": [[x,y,...], ...], "a": area%, "e": 1?}}}
Usage: python3 tools/gen-hit-regions.py banks/medterm/study/study-images.json [more study json ...]
"""
import json, os, sys, math
import numpy as np, cv2
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def load_rgb(path, w=None, h=None):
    if path.endswith('.svg'):
        import cairosvg, io
        im = Image.open(io.BytesIO(cairosvg.svg2png(url=path, output_width=w or 1200, output_height=h)))
    else:
        im = Image.open(path)
    try: im.seek(0)
    except Exception: pass
    im = im.convert('RGBA')
    a = np.asarray(im).astype(np.float32)
    rgb = a[..., :3] * (a[..., 3:] / 255.0) + 255.0 * (1 - a[..., 3:] / 255.0)  # transparent → white
    return rgb.astype(np.uint8)

def bg_mask(lab, rgb):
    h, w = lab.shape[:2]
    edge = np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]).reshape(-1, 3).astype(np.float32)
    cols = [np.median(edge, axis=0)]
    m = np.zeros((h, w), bool)
    L = lab.astype(np.float32)
    for c in cols:
        d = np.sqrt(((L - c) ** 2).sum(-1))
        m |= d < 10
    # pale, nearly colourless pixels (paper, translucent body outlines) are background too
    C = np.sqrt((L[..., 1] - 128) ** 2 + (L[..., 2] - 128) ** 2)
    m |= (C < 9) & (L[..., 0] > 200)
    # a colour that fills a big part of the picture (the skin of a body outline, a backdrop) is background too
    q = (L[~m] // 6).astype(np.int32)
    if len(q):
        keys = q[:, 0] * 10000 + q[:, 1] * 100 + q[:, 2]
        u, cnt = np.unique(keys, return_counts=True)
        for k in u[np.argsort(cnt)[::-1][:3]]:
            frac = cnt[u == k][0] / (h * w)
            if frac < 0.06: break
            c = np.array([k // 10000, (k // 100) % 100, k % 100], np.float32) * 6 + 3
            d = np.sqrt(((L[..., 0] - c[0]) * 0.6) ** 2 + (L[..., 1] - c[1]) ** 2 + (L[..., 2] - c[2]) ** 2)
            big = (d < 9) & ~m
            if big.mean() > 0.15: m |= big
    return m

def trace(rgb, lab, bgm, ax, ay, others, T=16):
    h, w = bgm.shape
    x0, y0 = int(round(ax / 100 * (w - 1))), int(round(ay / 100 * (h - 1)))
    x0 = min(max(x0, 0), w - 1); y0 = min(max(y0, 0), h - 1)
    # seed: the nearest non-background pixel within a small window
    best = None
    R = max(4, int(0.012 * max(w, h)))
    for dy in range(-R, R + 1):
        for dx in range(-R, R + 1):
            x, y = x0 + dx, y0 + dy
            if 0 <= x < w and 0 <= y < h and not bgm[y, x]:
                d = dx * dx + dy * dy
                if best is None or d < best[0]: best = (d, x, y)
    if best is None: return None
    _, sx, sy = best
    L = lab.astype(np.float32)
    win = L[max(0, sy - 2):sy + 3, max(0, sx - 2):sx + 3].reshape(-1, 3)
    seed = np.median(win, axis=0)
    for t in (T, T * 0.7, T * 0.5):
        d = np.sqrt(((L[..., 0] - seed[0]) * 0.5) ** 2 + (L[..., 1] - seed[1]) ** 2 + (L[..., 2] - seed[2]) ** 2)
        ok = ((d < t) & ~bgm).astype(np.uint8)
        k = max(3, int(0.006 * max(w, h)) | 1)
        ok = cv2.morphologyEx(ok, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
        n, lbl, stats, _ = cv2.connectedComponentsWithStats(ok, 8)
        c = lbl[sy, sx]
        if c == 0:
            # seed fell into a closing gap: take the component nearest the seed
            ys, xs = np.nonzero(lbl)
            if not len(xs): return None
            i = np.argmin((xs - sx) ** 2 + (ys - sy) ** 2); c = lbl[ys[i], xs[i]]
        area = stats[c, cv2.CC_STAT_AREA] / (w * h)
        if area <= 0.15: break
    else:
        return None
    if area < 0.0004: return None
    m = (lbl == c).astype(np.uint8)
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    polys = []
    for cnt in sorted(cs, key=cv2.contourArea, reverse=True)[:3]:
        if cv2.contourArea(cnt) < 0.15 * cv2.contourArea(max(cs, key=cv2.contourArea)): continue
        eps = 0.004 * max(w, h)
        ap = cv2.approxPolyDP(cnt, eps, True).reshape(-1, 2)
        if len(ap) > 60: ap = cv2.approxPolyDP(cnt, eps * 2.5, True).reshape(-1, 2)
        if len(ap) < 3: continue
        polys.append([round(v, 1) for p in ap for v in (p[0] / (w - 1) * 100, p[1] / (h - 1) * 100)])
    return {'p': polys, 'a': round(area * 100, 3)} if polys else None

def line_end(rgb, box):
    """No anchor in the data: follow the leader line drawn in the picture from the label box to its far end."""
    h, w = rgb.shape[:2]
    g = rgb.astype(np.int16); gray = g.mean(-1); chroma = g.max(-1) - g.min(-1)
    dark = ((gray < 120) & (chroma < 40)).astype(np.uint8)
    x0, y0 = int(box['x'] / 100 * w), int(box['y'] / 100 * h); x1, y1 = int((box['x'] + box['w']) / 100 * w), int((box['y'] + box['h']) / 100 * h)
    pad = max(4, int(0.012 * w))
    inner = np.zeros_like(dark); inner[max(0, y0):y1, max(0, x0):x1] = 1
    ring = np.zeros_like(dark); ring[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad] = 1; ring[inner == 1] = 0
    d2 = dark.copy(); d2[inner == 1] = 0  # the printed name itself is not part of the line
    n, lbl, st, _ = cv2.connectedComponentsWithStats(d2, 8)
    cands = set(np.unique(lbl[(ring == 1) & (d2 == 1)])) - {0}
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; best = None
    for c in cands:
        ys, xs = np.nonzero(lbl == c)
        if len(xs) < 8: continue
        dd = (xs - cx) ** 2 + ((ys - cy) * 1.0) ** 2; i = int(np.argmax(dd)); reach = math.sqrt(dd[i])
        ext = max(st[c, cv2.CC_STAT_WIDTH], st[c, cv2.CC_STAT_HEIGHT])
        thin = len(xs) / max(1, ext) < 9  # a line, not a filled shape or a busy outline
        if not thin or reach < pad * 2: continue
        if best is None or reach > best[0]: best = (reach, xs[i], ys[i])
    if not best: return None
    return (best[1] / (w - 1) * 100, best[2] / (h - 1) * 100)

def ellipse(ax, ay, others, w, h):
    # radius: 40% of the distance to the nearest other anchor, 1.5-5% of the picture
    asp = w / h
    dn = min([math.hypot((ax - o[0]), (ay - o[1]) / asp) for o in others] or [10])
    r = max(1.5, min(5.0, dn * 0.4)); rx, ry = r, r * asp
    pts = []
    for i in range(16):
        t = i / 16 * 2 * math.pi
        pts += [round(min(100, max(0, ax + rx * math.cos(t))), 1), round(min(100, max(0, ay + ry * math.sin(t))), 1)]
    return {'p': [pts], 'a': round(math.pi * rx * ry / 100, 3), 'f': 1}

def anchors(a):
    a = a if isinstance(a, list) else [a] if a else []
    return [x for x in a if x and isinstance(x.get('x'), (int, float))]

def pictures(study):
    """yield (src, w, h, {label id: [(ax, ay), ...]}) for every labelled picture"""
    for ch in study['chapters']:
        for img in ch['images']:
            if img.get('kind') == 'single-structure' or not img.get('labels'): continue
            if img.get('views'):
                for v in img['views']:
                    for fr in v['frames']:
                        yield fr['src'], img.get('width'), img.get('height'), {k: [(q[4], q[5])] for k, q in fr['pos'].items()}
            elif img.get('variants'):
                for v in img['variants']:
                    yield v.get('blank') or img.get('blank'), v.get('width') or img.get('width'), v.get('height') or img.get('height'), {k: [(a['x'], a['y']) for a in anchors(q.get('anchor'))] or q for k, q in v['pos'].items()}
            else:
                yield img.get('blank'), img.get('width'), img.get('height'), {l['id']: [(a['x'], a['y']) for a in anchors(l.get('anchor'))] or (l if 'x' in l else []) for l in img['labels']}

def main(paths):
    for sp in paths:
        study = json.load(open(os.path.join(ROOT, sp)))
        out_p = os.path.join(ROOT, os.path.dirname(sp), 'hit-regions.json')
        out = json.load(open(out_p)) if os.path.exists(out_p) else {}
        ov_p = os.path.join(ROOT, os.path.dirname(sp), 'hit-overrides.json')
        ov = json.load(open(ov_p)) if os.path.exists(ov_p) else {}
        stats = {'traced': 0, 'ellipse': 0, 'exact': 0, 'no-anchor': 0}
        for src, W0, H0, labs in pictures(study):
            if not src or not os.path.exists(os.path.join(ROOT, src)): continue
            rgb = load_rgb(os.path.join(ROOT, src), W0, H0); h, w = rgb.shape[:2]
            lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)
            bgm = bg_mask(lab, rgb)
            res = {}
            found = {}
            for lid in list(labs):
                if isinstance(labs[lid], dict):
                    e = line_end(rgb, labs[lid]); labs[lid] = [e] if e else []
                    if e: found[lid] = e
                    if e: stats['line-end'] = stats.get('line-end', 0) + 1
            allA = [(lid, a) for lid, aa in labs.items() for a in aa]
            for lid, aa in labs.items():
                if src in ov and lid in ov[src]:
                    res[lid] = dict(ov[src][lid], e=1); stats['exact'] += 1; continue
                if not aa: stats['no-anchor'] += 1; continue
                polys, area, fb = [], 0, False
                for (ax, ay) in aa:
                    others = [a for (l2, a) in allA if l2 != lid]
                    r = trace(rgb, lab, bgm, ax, ay, others)
                    if not r: r = ellipse(ax, ay, others, w, h); fb = True
                    polys += r['p']; area += r['a']
                res[lid] = {'p': polys, 'a': round(area, 3)}
                if lid in found: res[lid]['c'] = [round(found[lid][0], 1), round(found[lid][1], 1)]
                if fb: res[lid]['f'] = 1
                stats['ellipse' if fb else 'traced'] += 1
            out[src] = res
        json.dump(out, open(out_p, 'w'), separators=(',', ':'))
        print(sp, '→', os.path.relpath(out_p, ROOT), stats, os.path.getsize(out_p), 'bytes')

if __name__ == '__main__':
    main(sys.argv[1:] or ['banks/medterm/study/study-images.json', 'banks/anatomy/study/study-images.json'])
