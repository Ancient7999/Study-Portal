#!/usr/bin/env python3
"""Picture Study data fixes, safe to run again (each step checks before it changes anything).
1. Printed labels left on the blank pictures become blanks: a box over the printed text (cover: true),
   answer in Title Case (tools/printed-labels.py; boxes from tools/printed-labels-ocr.json).
2. Paired structures get side-specific names; the bare name is an alias (accepted, shown in full).
3. Male Reproductive Picture 1: the two Urethra boxes become Membranous / Spongy Urethra; stray foot cropped.
4. Liver, Gall Bladder and Duodenum Picture 1: Pancreas line ends on the pancreas; Head / Body / Tail of
   Pancreas added with their own leader lines (drawn into both pictures).
"""
import json, os, re, sys
import numpy as np, cv2
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import importlib.util
spec = importlib.util.spec_from_file_location('pl', os.path.join(ROOT, 'tools', 'printed-labels.py')); pl = importlib.util.module_from_spec(spec); spec.loader.exec_module(pl)
OCR = json.load(open(os.path.join(ROOT, 'tools', 'printed-labels-ocr.json')))
docs = {}
def doc(f):
    if f not in docs: docs[f] = json.load(open(os.path.join(ROOT, f)))
    return docs[f]
def picture(f, iid):
    return [i for c in doc(f)['chapters'] for i in c['images'] if i['id'] == iid][0]
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
log = []

def frag_box(boxes, fr, used):
    want, at, nth, extra = fr, None, 1, False
    if want.startswith('+'): return ('extra', want[1:])
    if '#' in want: want, nth = want.split('#'); nth = int(nth)
    if '@' in want: want, at = want.split('@'); at = float(at)
    hits = [b for b in boxes if b[4] == want and (at is None or abs(b[0] - at) < 1.6) and id(b) not in used]
    if len(hits) < nth: raise SystemExit('fragment not found: %r' % fr)
    return hits[nth - 1]

def add_printed():
    for (f, iid, vid, ans, acc, frags) in pl.SPEC:
        img = picture(f, iid); key = f + '|' + iid + '|' + vid
        boxes = OCR[key]['boxes']; used = set(); rect = None
        for fr in frags:
            b = frag_box(boxes, fr, used)
            if b[0] == 'extra':
                x, y, w, h = rect; lh = h / max(1, frags.index(fr)); rect = [x, y, w, h + lh * 1.1]; continue
            used.add(id(b))
            r = [b[0], b[1], b[0] + b[2], b[1] + b[3]]
            rect = r if rect is None else [min(rect[0], r[0]), min(rect[1], r[1]), max(rect[0] + rect[2], r[2]) - min(rect[0], r[0]), max(rect[1] + rect[3], r[3]) - min(rect[1], r[1])]
            if len(rect) == 4 and rect is r: rect = [r[0], r[1], r[2] - r[0], r[3] - r[1]]
        x, y, w, h = rect
        x, y = max(0, x - 0.7), max(0, y - 0.6); w, h = min(100 - x, w + 1.4), min(100 - y, h + 1.2)
        box = {'x': round(x, 2), 'y': round(y, 2), 'w': round(w, 2), 'h': round(h, 2)}
        alias = [a[6:] for a in acc if a.startswith('alias:')]; acc = [a for a in acc if not a.startswith('alias:')]
        posmap = None if vid == '-' else [v for v in img['variants'] if v['id'] == vid][0]['pos']
        # one label per answer and picture; reuse it when another variant already has it
        same = [l for l in img['labels'] if l['answer'] == ans]
        if posmap is None:
            if any(l.get('cover') and abs(l.get('x', -9) - box['x']) < 1 and abs(l.get('y', -9) - box['y']) < 1 for l in img['labels']): continue
            lab = {'id': iid + '-' + slug(ans), 'answer': ans, 'accept': acc, 'cover': True}
            if alias: lab['alias'] = alias
            n = 2
            while any(l['id'] == lab['id'] for l in img['labels']): lab['id'] = iid + '-' + slug(ans) + '-' + str(n); n += 1
            lab.update(box); img['labels'].append(lab); log.append((iid, vid, ans)); continue
        free = [l for l in same if l['id'] not in posmap]
        if any(l['id'] in posmap and posmap[l['id']].get('cover') for l in same): continue  # done before
        if free: lab = free[0]
        else:
            lab = {'id': iid + '-' + slug(ans), 'answer': ans, 'accept': acc}
            n = 2
            while any(l['id'] == lab['id'] for l in img['labels']): lab['id'] = iid + '-' + slug(ans) + '-' + str(n); n += 1
            img['labels'].append(lab)
        lab['cover'] = True
        for a in acc:
            if a not in lab.setdefault('accept', []): lab['accept'].append(a)
        if alias: lab['alias'] = sorted(set(lab.get('alias', []) + alias), key=alias.index if all(a in alias for a in lab.get('alias', [])) else None)
        posmap[lab['id']] = dict(box, cover=True); log.append((iid, vid, ans))

def sides():
    img = picture('banks/medterm/study/study-images.json', 'urinary-system')
    L = {l['id']: l for l in img['labels']}
    def name(lid, ans, alias):
        l = L[lid]; l['answer'] = ans; l['alias'] = alias; l['accept'] = [a for a in l.get('accept', []) if a not in alias]
    name('urinary-system-kidney', 'Left Kidney', ['Kidney', 'Kidneys'])
    name('urinary-system-kidney-2', 'Right Kidney', ['Kidney', 'Kidneys'])
    name('urinary-system-ureter', 'Right Ureter', ['Ureter', 'Ureters'])
    if 'urinary-system-left-ureter' not in L:
        img['labels'].insert(3, {'id': 'urinary-system-left-ureter', 'answer': 'Left Ureter', 'accept': [], 'alias': ['Ureter', 'Ureters']})
    v2 = [v for v in img['variants'] if v['id'] == 'v2'][0]['pos']
    if 'urinary-system-ureter' in v2: v2['urinary-system-left-ureter'] = v2.pop('urinary-system-ureter')  # Picture 2 points at the left ureter
    # other left/right pairs that shared one bare name (front views: the viewer's left is the body's right)
    def split(iid, vid, old, new, ans, alias):
        im = picture('banks/medterm/study/study-images.json', iid); Lx = {l['id']: l for l in im['labels']}
        if new not in Lx: im['labels'].append({'id': new, 'answer': ans, 'accept': [], 'alias': alias})
        pm = [v for v in im['variants'] if v['id'] == vid][0]['pos']
        if old in pm: pm[new] = pm.pop(old)
    def rename(iid, lid, ans, alias):
        im = picture('banks/medterm/study/study-images.json', iid); l = [l for l in im['labels'] if l['id'] == lid][0]
        l['answer'] = ans; l['alias'] = alias; l['accept'] = [a for a in l.get('accept', []) if a not in alias]
    rename('respiratory-system', 'respiratory-system-lungs', 'Right Lung', ['Lung', 'Lungs'])
    rename('respiratory-system', 'respiratory-system-lungs-2', 'Left Lung', ['Lung', 'Lungs'])
    split('respiratory-system', 'v2', 'respiratory-system-bronchi', 'respiratory-system-right-bronchus', 'Right Bronchus', ['Bronchus', 'Bronchi'])
    rename('respiratory-system', 'respiratory-system-bronchi-2', 'Left Bronchus', ['Bronchus', 'Bronchi'])
    split('heart-q2', 'v1', 'heart-q2-pulmonary-veins', 'heart-q2-right-pulmonary-veins', 'Right Pulmonary Veins', ['Pulmonary Veins', 'Pulmonary Vein'])
    rename('heart-q2', 'heart-q2-pulmonary-veins-2', 'Left Pulmonary Veins', ['Pulmonary Veins', 'Pulmonary Vein'])
    img2 = picture('banks/medterm/study/study-images.json', 'male-reproductive')
    L2 = {l['id']: l for l in img2['labels']}
    v1 = [v for v in img2['variants'] if v['id'] == 'v1'][0]['pos']
    for old, new, ans in (('male-reproductive-urethra', 'male-reproductive-membranous-urethra', 'Membranous Urethra'), ('male-reproductive-urethra-2', 'male-reproductive-spongy-urethra', 'Spongy Urethra')):
        if new not in L2:
            img2['labels'].append({'id': new, 'answer': ans, 'accept': ['Penile Urethra'] if 'Spongy' in ans else [], 'alias': ['Urethra']})
        if old in v1: v1[new] = v1.pop(old)
    img2['labels'][:] = [l for l in img2['labels'] if not (l['id'] == 'male-reproductive-urethra-2' and not any(l['id'] in v['pos'] for v in img2['variants']))]
    # foot left over from the source crop (top-left corner of Picture 1)
    for k in ('blank', 'labeled'):
        p = os.path.join(ROOT, [v for v in img2['variants'] if v['id'] == 'v1'][0][k]); im = Image.open(p).convert('RGB'); a = np.asarray(im).copy()
        reg = a[0:62, 0:150]
        if (reg.sum(-1) < 740).mean() > 0.002:
            a[0:62, 0:150] = 255; Image.fromarray(a).save(p, quality=92) if p.endswith('.jpg') else Image.fromarray(a).save(p, lossless=False, quality=92); log.append(('male-reproductive', 'v1', 'foot cropped (' + k + ')'))

def pancreas():
    img = picture('banks/medterm/study/study-images.json', 'duodenum')
    v1 = [v for v in img['variants'] if v['id'] == 'v1'][0]; pos = v1['pos']
    W, H = v1['width'], v1['height']
    P = lambda x, y: (int(round(x / 100 * W)), int(round(y / 100 * H)))
    new = [  # id, answer, box, line from, anchor (all checked to be pancreas yellow)
        ('duodenum-head-of-pancreas', 'Head of Pancreas', {'x': 56.0, 'y': 90.0, 'w': 20.0, 'h': 4.6}, (66.0, 90.0), (60.8, 74.0)),
        ('duodenum-body-of-pancreas', 'Body of Pancreas', {'x': 78.0, 'y': 82.0, 'w': 20.0, 'h': 4.6}, (78.0, 84.3), (65.4, 55.7)),
        ('duodenum-tail-of-pancreas', 'Tail of Pancreas', {'x': 80.0, 'y': 70.0, 'w': 18.0, 'h': 4.6}, (89.0, 70.0), (92.0, 61.9)),
    ]
    old = pos['duodenum-pancreas']['anchor']
    lines = []
    if abs(old['x'] - 59.3) > 0.01: lines.append(((old['x'], old['y']), (59.3, old['y']))); old['x'] = 59.3
    L = {l['id'] for l in img['labels']}
    for lid, ans, box, fr, an in new:
        if lid not in L: img['labels'].append({'id': lid, 'answer': ans, 'accept': [], 'showText': True})
        if lid not in pos: pos[lid] = dict(box, anchor={'x': an[0], 'y': an[1], 'from': {'x': fr[0], 'y': fr[1]}}); lines.append((fr, an))
    for k in ('blank', 'labeled'):
        p = os.path.join(ROOT, v1[k]); a = np.asarray(Image.open(p).convert('RGB')).copy()
        if not lines: continue
        b = a.astype(int)
        for lid, ans, box, fr, an in new + [('duodenum-pancreas', 'Pancreas', None, None, (old['x'], old['y']))]:
            # every line must end on the pancreas yellow (checked on the picture before the lines are drawn)
            x, y = P(*an); c = b[y - 6:y + 7, x - 6:x + 7].reshape(-1, 3)
            yellow = ((c[:, 0] > 235) & (c[:, 1] > 200) & (c[:, 1] < 235) & (c[:, 2] < 170)).mean()
            assert yellow > 0.7, (lid, k, yellow)
        for (x0, y0), (x1, y1) in lines: cv2.line(a, P(x0, y0), P(x1, y1), (40, 40, 40), 3, cv2.LINE_AA)
        Image.fromarray(a).save(p, quality=94)
    if lines: log.append(('duodenum', 'v1', 'pancreas line fixed, Head/Body/Tail of Pancreas added'))

def tidy():
    # keep neighbouring boxes from overlapping after the printed labels became boxes
    img = picture('banks/medterm/study/study-images.json', 'male-reproductive')
    pos = img['variants'][0]['pos']
    want = {'male-reproductive-vas-deferens': {'h': 5.0}, 'male-reproductive-bulbourethral-gland': {'y': 49.0, 'h': 3.9},
            'male-reproductive-muscles-of-perineum-surrounding-anus': {'h': 7.9}, 'male-reproductive-membranous-urethra': {'y': 60.9, 'h': 5.0}}
    for lid, ch in want.items():
        if lid in pos and any(abs(pos[lid][k] - v) > 1e-6 for k, v in ch.items()):
            pos[lid].update(ch); log.append(('male-reproductive', 'v1', lid + ' box moved/resized so boxes do not overlap'))

add_printed(); sides(); pancreas(); tidy()
for f, d in docs.items():
    json.dump(d, open(os.path.join(ROOT, f), 'w'), indent=1, ensure_ascii=False); open(os.path.join(ROOT, f), 'a').write('\n') if False else None
for x in log: print(*x, sep=' · ')
print(len(log), 'changes')
