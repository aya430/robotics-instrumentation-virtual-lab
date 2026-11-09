"""Rasterise the unit slide PDFs into WebP pages for the website flipbook.
- Footer: institution name and course code removed (left and middle segments redrawn).
- First (title) and last (thank-you) slides replaced with neutral versions
  without institution logo, campus photo, school or course code.
"""
import subprocess, os, json, glob, sys
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'notes')
FR = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
FB = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'
NAVY, GOLD, WHITE = (21, 28, 85), (198, 146, 0), (255, 255, 255)
W, H, Y0 = 1280, 720, 691
ROMAN = ['I', 'II', 'III', 'IV']
f = lambda p, s: ImageFont.truetype(p, s)

def ctext(d, cx, cy, txt, font, fill):
    b = d.textbbox((0, 0), txt, font=font)
    d.text((cx - (b[2] - b[0]) / 2 - b[0], cy - (b[3] - b[1]) / 2 - b[1]), txt, font=font, fill=fill)

def footer(im, right_from=None):
    d = ImageDraw.Draw(im)
    if right_from is not None:
        im.paste(right_from.crop((853, Y0, W, H)), (853, Y0))
    d.rectangle((0, Y0, 426, H), fill=WHITE)
    d.rectangle((427, Y0, 852, H), fill=GOLD)
    ft = f(FR, 16)
    ctext(d, 213, (Y0 + H) / 2, 'Dr. Bansilal Bairwa', ft, NAVY)
    ctext(d, 640, (Y0 + H) / 2, 'Robotics and Instrumentation', ft, WHITE)

def background():
    im = Image.new('RGB', (W, H), (246, 248, 252))
    d = ImageDraw.Draw(im)
    for x in range(0, W, 40): d.line((x, 0, x, Y0), fill=(232, 236, 245))
    for y in range(0, Y0, 40): d.line((0, y, W, y), fill=(232, 236, 245))
    return im, d

def cover(unit_title, ref):
    im, d = background()
    d.rounded_rectangle((20, 78, W - 20, 270), 14, fill=NAVY)
    ctext(d, W / 2, 132, 'Robotics and Instrumentation', f(FR, 46), WHITE)
    ctext(d, W / 2, 186, 'Lecture Slides', f(FR, 30), WHITE)
    ctext(d, W / 2, 230, unit_title, f(FR, 30), WHITE)
    ctext(d, W / 2, 340, 'Dr. Bansilal Bairwa', f(FR, 32), (20, 20, 20))
    ctext(d, W / 2, 392, 'bansilal.bairwa@reva.edu.in', f(FR, 24), (60, 70, 100))
    d.rounded_rectangle((W / 2 - 230, 470, W / 2 + 230, 520), 25, fill=(255, 244, 214), outline=GOLD, width=2)
    ctext(d, W / 2, 495, 'For study purposes only', f(FB, 24), (120, 84, 0))
    footer(im, ref)
    return im

def closing(ref):
    im, d = background()
    ctext(d, W / 2, 200, 'Thank You', f(FB, 72), NAVY)
    ctext(d, W / 2, 300, 'Robotics and Instrumentation', f(FR, 34), (20, 20, 20))
    ctext(d, W / 2, 350, 'Dr. Bansilal Bairwa  ·  bansilal.bairwa@reva.edu.in', f(FR, 26), (60, 70, 100))
    ctext(d, W / 2, 470, 'Refer to the detailed Robotics and Instrumentation lecture notes for complete', f(FR, 22), (110, 120, 140))
    ctext(d, W / 2, 502, 'derivations, programs and the question banks.', f(FR, 22), (110, 120, 140))
    footer(im, ref)
    return im

manifest = {}
for i in range(1, 5):
    src = f'u{i}.pdf'
    title = subprocess.run(['pdftotext', '-f', '1', '-l', '1', src, '-'], capture_output=True, text=True).stdout.splitlines()[2].strip()
    tmp = f'r{i}'; os.makedirs(tmp, exist_ok=True)
    if not glob.glob(f'{tmp}/*.png'):
        subprocess.run(['pdftoppm', '-r', '203.2', '-png', src, f'{tmp}/p'], check=True)
    pages = sorted(glob.glob(f'{tmp}/*.png'))
    od = f'{OUT}/unit-{i}'; os.makedirs(od, exist_ok=True)
    for n, p in enumerate(pages, 1):
        im = Image.open(p).convert('RGB')
        if im.size != (W, H): im = im.resize((W, H), Image.LANCZOS)
        if n == 1: im = cover(title, im)
        elif n == len(pages): im = closing(im)
        elif im.getpixel((600, Y0 + 3)) == GOLD: footer(im)
        else: print('no footer on', p)
        im.save(f'{od}/p{n:03d}.webp', 'WEBP', quality=80, method=6)
    manifest[i] = {'title': title, 'pages': len(pages)}
    print(i, title, len(pages))
json.dump(manifest, open(f'{OUT}/manifest.json', 'w'), indent=1)
