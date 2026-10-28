#!/usr/bin/env python3
"""Adds the Larynx (Laryngeal Skeleton) and Villi pictures to the Medical Terminology Picture Study (safe to run again).
Every printed label becomes a blank: a box over the printed text (cover: true), boxes from OCR of the source images.
Sources (prepared copies in /workspace/newpics-src): see CREDITS.md."""
import json, os, re
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.environ.get('NEWPICS', '/workspace/newpics-src')
F = os.path.join(ROOT, 'banks/medterm/study/study-images.json')
OCR = json.load(open(os.path.join(SRC, 'ocr.json')))
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
def fr_box(boxes, fr, used):
    want, at = fr, None
    if '@' in want: want, at = want.split('@'); at = float(at)
    for b in boxes:
        if b[4].strip(' -') == want and id(b) not in used and (at is None or abs(b[1] - at) < 1.5):
            used.add(id(b)); return b
    raise SystemExit('fragment not found: %r' % fr)
PICS = [
 dict(lecture='lec16-17', after='pharynx-trachea-esophagus', id='larynx', title='The Larynx (Laryngeal Skeleton)',
  caption='The larynx is a frame of cartilages joined by membranes and ligaments. The thyroid cartilage forms the front, the cricoid cartilage is the ring below it, and the epiglottis closes over the airway when you swallow.',
  alt='Diagram for labelling: the cartilages, membranes and ligaments of the larynx. Two pictures from different sources show the same structures.',
  labels=[('Epiglottis', ['Epiglottic Cartilage']), ('Hyoid Bone', ['Body of Hyoid Bone', 'Hyoid']), ('Thyrohyoid Membrane', []),
   ('Thyroid Cartilage', ['Thyroid']), ('Laryngeal Prominence', ["Adam's Apple", 'Adams Apple']), ('Cricothyroid Ligament', ['Median Cricothyroid Ligament', 'Cricothyroid Membrane']),
   ('Cricoid Cartilage', ['Cricoid']), ('Cricotracheal Ligament', []), ('Tracheal Cartilages', ['Tracheal Cartilage', 'Tracheal Rings']),
   ('Cuneiform Cartilage', ['Cuneiform']), ('Corniculate Cartilage', ['Corniculate']), ('Arytenoid Cartilage', ['Arytenoid', 'Arytenoids']),
   ('Fatty Pad', ['Fat Pad']), ('Vestibular Fold', ['False Vocal Cord', 'False Vocal Fold', 'Ventricular Fold']), ('Vocal Fold', ['True Vocal Cord', 'Vocal Cord', 'Vocal Folds']),
   ('Median Thyrohyoid Ligament', []), ('Lateral Thyrohyoid Ligament', []), ('Superior Cornu of Thyroid Cartilage', ['Superior Horn of Thyroid Cartilage', 'Superior Cornu']),
   ('Laryngeal Incisure', ['Thyroid Notch', 'Superior Thyroid Notch']), ('Superior Laryngeal Nerve and Artery', []), ('Oblique Line', []),
   ('Cricothyroid Muscle', ['Cricothyroid']), ('Inferior Cornu of Thyroid Cartilage', ['Inferior Horn of Thyroid Cartilage', 'Inferior Cornu']),
   ('Conus Elasticus', ['Cricovocal Membrane']), ('Cricothyroid Joint', []), ('Trachea', ['Windpipe'])],
  variants=[
   dict(file='larynx-v1.png', credit='OpenStax College, via Wikimedia Commons', license='CC BY 3.0', licenseUrl='https://creativecommons.org/licenses/by/3.0',
    sourceUrl='https://commons.wikimedia.org/wiki/File:2306_The_Larynx.jpg', marks=[
     ('Epiglottis', ['Epiglottis@2.39']), ('Hyoid Bone', ['Body of hyoid bone@6.81']), ('Thyrohyoid Membrane', ['Thyrohyoid membrane@9.15']),
     ('Thyroid Cartilage', ['Thyroid cartilage@13.69']), ('Laryngeal Prominence', ['Laryngeal prominence']), ('Cricothyroid Ligament', ['Cricothyroid ligament@25.7']),
     ('Cricoid Cartilage', ['Cricoid cartilage@27.5']), ('Cricotracheal Ligament', ['Cricotracheal ligament@29.95']), ('Tracheal Cartilages', ['Tracheal cartilages@35.03']),
     ('Epiglottis#2', ['Epiglottis@52.24']), ('Thyrohyoid Membrane#2', ['Thyrohyoid membrane@57.08']), ('Hyoid Bone#2', ['Body of hyoid bone@59.41']),
     ('Fatty Pad', ['Fatty pad']), ('Cuneiform Cartilage', ['Cuneiform cartilage']), ('Thyrohyoid Membrane#3', ['Thyrohyoid membrane@65.63']),
     ('Corniculate Cartilage', ['Corniculate cartilage']), ('Vestibular Fold', ['Vestibular fold']), ('Arytenoid Cartilage', ['Arytenoid cartilage']),
     ('Vocal Fold', ['Vocal fold']), ('Thyroid Cartilage#2', ['Thyroid cartilage@74.6']), ('Cricoid Cartilage#2', ['Cricoid cartilage@78.06']),
     ('Cricothyroid Ligament#2', ['Cricothyroid ligament@78.24']), ('Cricotracheal Ligament#2', ['Cricotracheal ligament@82.31']), ('Tracheal Cartilages#2', ['Tracheal cartilages@86.91'])]),
   dict(file='larynx-v2.png', credit='Olek Remesz (Orem), via Wikimedia Commons', license='CC BY-SA 2.5', licenseUrl='https://creativecommons.org/licenses/by-sa/2.5',
    sourceUrl='https://commons.wikimedia.org/wiki/File:Larynx_external_en.svg', marks=[
     ('Hyoid Bone', ['hyoid bone']), ('Thyrohyoid Membrane', ['thyrohyoid membrane']), ('Median Thyrohyoid Ligament', ['median thyrohyoid', 'ligament@22.6#L']),
     ('Lateral Thyrohyoid Ligament', ['lateral thyrohyoid', 'ligament@22.6#R']), ('Superior Cornu of Thyroid Cartilage', ['superior cornu', 'of thyroid cartilage@30.14']),
     ('Laryngeal Incisure', ['laryngeal incisure']), ('Superior Laryngeal Nerve and Artery', ['superior laryngeal', 'nerve and artery']),
     ('Thyroid Cartilage', ['thyroid cartilage']), ('Oblique Line', ['oblique line']), ('Cricothyroid Muscle', ['cricothyroid muscle']),
     ('Cricothyroid Ligament', ['median cricothyroid', 'ligament@53.83']), ('Inferior Cornu of Thyroid Cartilage', ['inferior cornu', 'of thyroid cartilage@58.59']),
     ('Conus Elasticus', ['conus elasticus']), ('Cricothyroid Joint', ['cricothyroid joint']), ('Cricoid Cartilage', ['cricoid cartilage']), ('Trachea', ['trachea'])])]),
 dict(lecture='body-systems', after='small-intestine', id='villi', title='Villi of the Small Intestine',
  caption='The lining of the small intestine is folded into circular folds covered with finger-like villi. Each villus holds capillaries and a lacteal, and its cells carry microvilli, so the surface for absorption is huge.',
  alt='Diagram for labelling: the small intestine wall with its villi. Two pictures from different sources show the same structures.',
  labels=[('Villi', ['Villus', 'Intestinal Villi']), ('Circular Folds', ['Circular Fold', 'Plicae Circulares']), ('Lumen', []), ('Muscle Layers', ['Muscularis', 'Muscularis Externa', 'Muscle Layer']),
   ('Vessel Carrying Blood', []), ('Lacteal', ['Lacteals']), ('Absorptive Cells', ['Absorptive Cell', 'Enterocytes', 'Enterocyte']),
   ('Capillaries', ['Capillary', 'Blood Capillaries']), ('Artery', ['Arteriole']), ('Goblet Cell', ['Goblet Cells']), ('Microvilli', ['Brush Border', 'Microvilli (Brush Border)']),
   ('Intestinal Crypt', ['Crypt', 'Intestinal Gland', 'Crypt of Lieberkuhn', 'Crypt of Lieberkühn']), ('Lymphatic Vessel', ['Lymphatic Vesicle', 'Lymph Vessel']),
   ('Muscularis Mucosae', []), ('Duodenal Gland', ["Brunner's Gland", 'Brunners Gland', 'Duodenal Glands']),
   ('Thin Surface Layer', ['Epithelium', 'Surface Epithelium', 'Surface Layer']), ('Blood Vessel', ['Blood Vessels'])],
  variants=[
   dict(file='villi-v1.png', credit='OpenStax College, via Wikimedia Commons', license='CC BY 3.0', licenseUrl='https://creativecommons.org/licenses/by/3.0',
    sourceUrl='https://commons.wikimedia.org/wiki/File:2418_Histology_Small_IntestinesN.jpg', note='cropped to part (a)', marks=[
     ('Lacteal', ['Lacteal']), ('Absorptive Cells', ['Absorptive cells']), ('Vessel Carrying Blood', ['Vessel carrying', 'blood']), ('Capillaries', ['Capillary']),
     ('Microvilli', ['Microvilli', '(brushborder)']), ('Artery', ['Artery']), ('Goblet Cell', ['Goblet cell']), ('Lumen', ['Lumen']),
     ('Circular Folds', ['Circular', 'folds']), ('Muscle Layers', ['Muscle', 'layers']), ('Villi', ['Villi']), ('Intestinal Crypt', ['Intestinal crypt']),
     ('Lymphatic Vessel', ['Lymphatic vesicle']), ('Muscularis Mucosae', ['Muscularismucosae']), ('Duodenal Gland', ['Duodenalgland'])]),
   dict(file='villi-v2.png', credit='Snow93, via Wikimedia Commons', license='Public domain', licenseUrl='https://creativecommons.org/publicdomain/mark/1.0/',
    sourceUrl='https://commons.wikimedia.org/wiki/File:Intestinal_villus_simplified.svg', marks=[
     ('Thin Surface Layer', ['Thin surface layer']), ('Capillaries', ['Capillaries']), ('Lacteal', ['Lacteal']), ('Blood Vessel', ['Blood vessel'])])])]

def main():
    D = json.load(open(F))
    for P in PICS:
        ch = next(c for c in D['chapters'] if c['lecture'] == P['lecture'])
        ch['images'] = [i for i in ch['images'] if i['id'] != P['id']]
        labels, seen = [], {}
        variants = []
        for k, V in enumerate(P['variants'], 1):
            im = Image.open(os.path.join(SRC, V['file'])).convert('RGB'); W, H = im.size
            rel = 'banks/medterm/study/%s/%s-v%d' % (P['lecture'], P['id'], k)
            im.save(os.path.join(ROOT, rel + '-labeled.webp'), quality=88); im.save(os.path.join(ROOT, rel + '-blank.webp'), quality=88)
            boxes = [b for b in OCR[V['file']]]; used = set(); pos = {}
            for mark, frs in V['marks']:
                name, n = (mark.split('#') + ['1'])[:2]
                lid = P['id'] + '-' + slug(name) + ('' if n == '1' else '-' + n)
                if lid not in seen:
                    acc = dict(P['labels'])[name]; seen[lid] = 1; labels.append({'id': lid, 'answer': name, 'accept': acc})
                rs = []
                for fr in frs:
                    side = None
                    if fr.endswith('#L') or fr.endswith('#R'): side = fr[-1]; fr = fr[:-2]
                    want, at = (fr.split('@') + [None])[:2]
                    cands = [b for b in boxes if b[4].strip(' -') == want and id(b) not in used and (at is None or abs(b[1] - float(at)) < 1.5)]
                    if side: cands = [b for b in cands if (b[0] < 50) == (side == 'L')]
                    if not cands: raise SystemExit('fragment not found: %s %r' % (V['file'], fr))
                    used.add(id(cands[0])); rs.append(cands[0])
                x0 = min(b[0] for b in rs); y0 = min(b[1] for b in rs); x1 = max(b[0] + b[2] for b in rs); y1 = max(b[1] + b[3] for b in rs)
                px, py = 0.6, 0.6 * W / H
                pos[lid] = {'x': round(max(0, x0 - px), 2), 'y': round(max(0, y0 - py), 2), 'w': round(min(100, x1 + px) - max(0, x0 - px), 2), 'h': round(min(100, y1 + py) - max(0, y0 - py), 2), 'cover': True}
            left = [b[4] for b in boxes if id(b) not in used]
            if left: print('  printed text left visible on', V['file'], left)
            v = {'id': 'v%d' % k, 'name': 'Picture %d' % k, 'labeled': rel + '-labeled.webp', 'blank': rel + '-blank.webp', 'width': W, 'height': H,
                 'credit': V['credit'], 'license': V['license'], 'licenseUrl': V['licenseUrl'], 'sourceUrl': V['sourceUrl'], 'pos': pos}
            variants.append(v)
        img = {'id': P['id'], 'title': P['title'], 'caption': P['caption'], 'kind': 'labeled-diagram'}
        for key in ('credit', 'license', 'licenseUrl', 'sourceUrl', 'labeled', 'blank', 'width', 'height'): img[key] = variants[0][key]
        img.update({'alt': P['alt'], 'labels': labels, 'variants': variants})
        at = next((k for k, i in enumerate(ch['images']) if i['id'] == P['after']), len(ch['images']) - 1)
        ch['images'].insert(at + 1, img)
        print(P['id'], len(labels), 'labels', [len(v['pos']) for v in variants])
    json.dump(D, open(F, 'w'), ensure_ascii=False, indent=1)
main()
