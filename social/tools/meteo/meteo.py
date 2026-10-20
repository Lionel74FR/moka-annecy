#!/usr/bin/env python3
"""Story météo MOKA — génère la story du jour selon la météo d'Annecy.

Usage :
  python3 meteo.py                      # météo du jour via Open-Meteo
  python3 meteo.py --date 2026-10-22    # autre jour (prévision)
  python3 meteo.py --code 61 --tmin 6 --tmax 11 --pp 90   # météo fournie à la main

Écrit social/meteo/AAAA-MM-JJ.jpg (1080×1920) et affiche un JSON :
  {"file": ..., "alt": ..., "categorie": ..., "meteo": {...}}
Story texte + logo uniquement (pas de photo). Ne publie rien : la publication se fait ensuite (Metricool).
Jours d'ouverture : mardi → samedi. Dimanche et lundi : le script refuse (exit 2).
"""
import argparse, datetime as dt, json, os, re, sys, urllib.request
from PIL import Image, ImageDraw, ImageFont, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT_DIR = os.path.join(REPO, 'social', 'meteo')
LAT, LON = 45.899, 6.129  # 6 rue Vaugelas, Annecy

CR = (247, 232, 210); BX = (106, 12, 18); OR = (232, 181, 48)
THEMES = {'bx': dict(bg=BX, ink=CR, soft=(226, 190, 180), acc=OR),
          'cr': dict(bg=CR, ink=BX, soft=(122, 62, 52), acc=BX)}

# ---------- typographie (règles maison : 9h, 16€, 20h30 collés ; titres sans point) ----------
def norm(t):
    t = re.sub(r'(\d) (h|H|€)', r'\1\2', t)
    return re.sub(r'(\d)([hH]) (\d)', r'\1\2\3', t)

def ft(size, w=760):
    f = ImageFont.truetype(os.path.join(HERE, 'fonts', 'Fraunces-Italic.ttf'), size)
    f.set_variation_by_axes([144, w, 100, 0]); return f

def sans(size, w=700):
    f = ImageFont.truetype(os.path.join(HERE, 'fonts', 'BricolageGrotesque.ttf'), size)
    f.set_variation_by_axes([96 if size >= 40 else 24, w, 100]); return f

def wordmark(width, color):
    m = Image.open(os.path.join(HERE, 'wm_mask.png')).convert('L')
    m = m.resize((width, int(m.height * width / m.width)), Image.LANCZOS)
    im = Image.new('RGBA', m.size, color + (0,)); im.putalpha(m); return im

def fit(d, text, mk, size, maxw):
    while size > 40 and d.textlength(norm(text), font=mk(size)) > maxw: size -= 4
    return size

def C(d, y, text, font, fill):
    d.text((540, y), norm(text), font=font, fill=fill, anchor='mm')

def cover(im, W, H, cy):
    r = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    x = (im.width - W) // 2; y = int((im.height - H) * cy)
    return im.crop((x, y, x + W, y + H))

# ---------- météo ----------
def fetch(day):
    url = (f'https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LON}'
           '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
           f'&timezone=Europe%2FParis&start_date={day}&end_date={day}')
    err = None
    for _ in range(4):  # le réseau est parfois lent : on réessaie
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                dd = json.load(r)['daily']; break
        except Exception as e:
            err = e
    else:
        raise SystemExit(f'Météo indisponible ({err}). Relancer avec --code --tmin --tmax --pp.')
    return dict(code=dd['weather_code'][0], tmax=dd['temperature_2m_max'][0],
                tmin=dd['temperature_2m_min'][0], pp=dd['precipitation_probability_max'][0] or 0)

def categorie(m):
    c, tmax, pp = m['code'], m['tmax'], m['pp']
    if c >= 95: return 'orage'
    if 71 <= c <= 77 or c in (85, 86): return 'neige'
    if 51 <= c <= 67 or 80 <= c <= 82 or pp >= 70: return 'pluie'
    if tmax <= 7: return 'froid'
    if c <= 1 and tmax >= 16: return 'soleil'
    if c <= 1: return 'beau_frais'
    return 'gris'

# ---------- banque de messages (validée : tutoiement, pas de bubble tea) ----------
# {tmin} {tmax} remplacés ; DAY = ligne selon le jour ; BUREAU = variante télétravail (mardi → jeudi)
BANK = {
 'pluie': [
   dict(k='IL PLEUT SUR ANNECY', t=['Viens te mettre', 'au sec'], i=['Café chaud et brunch dès 9 h', 'DAY'], p='ricotta', th='bx'),
   dict(k='{tmax}° ET DE LA PLUIE', t=['Ton bureau', 'au chaud'], i=['Wifi, prises et un bon latte', 'DAY'], p='matcha_viennoiseries', th='bx', bureau=True),
   dict(k='JOUR DE PLUIE', t=['Croissant', 'et café chaud'], i=['Viennoiseries du jour dès 9 h', 'DAY'], p='viennoiseries_2', th='cr'),
 ],
 'orage': [dict(k='ORAGES PRÉVUS', t=['Reste', 'à l’abri'], i=['Café, brunch, déjeuner', 'DAY'], p='matcha_viennoiseries', th='bx')],
 'neige': [dict(k='IL NEIGE SUR ANNECY', t=['Viens te', 'réchauffer'], i=['Cappuccino, chaï latte, chocolat chaud', 'DAY'], p='viennoiseries_2', th='bx')],
 'froid': [
   dict(k='{tmin}° CE MATIN', t=['Il fait meilleur', 'à l’intérieur'], i=['Cappuccino, chaï latte, chocolat chaud', 'DAY'], p='matcha_viennoiseries', th='bx'),
   dict(k='{tmin}° CE MATIN', t=['Ton bureau', 'au chaud'], i=['Wifi, prises et un bon latte', 'DAY'], p='viennoiseries_2', th='cr', bureau=True),
 ],
 'gris': [
   dict(k='CIEL GRIS SUR ANNECY', t=['Un latte', 'et ça repart'], i=['Café chaud dès 9 h', 'DAY'], p='oeufs_saumon', th='bx'),
   dict(k='JOURNÉE GRISE', t=['Ton bureau', 'au chaud'], i=['Wifi, prises et un bon latte', 'DAY'], p='matcha_viennoiseries', th='cr', bureau=True),
   dict(k='CIEL GRIS SUR ANNECY', t=['Brunch', 'dès 9 h'], i=['Brunch Moka 16 €', 'DAY'], p='egg_muffin', th='cr'),
 ],
 'soleil': [
   dict(k='GRAND SOLEIL · {tmax}°', t=['Un jus pressé', 'au soleil'], i=['Orange pressée 5 € · dès 9 h', 'DAY'], p='jus_orange', th='cr'),
   dict(k='GRAND SOLEIL · {tmax}°', t=['Jus pressé', 'et brunch'], i=['Brunch Moka 16 €', 'DAY'], p='ptit_dej_table', th='bx'),
 ],
 'beau_frais': [
   dict(k='SOLEIL ET {tmin}° CE MATIN', t=['Café chaud,', 'ciel bleu'], i=['Brunch dès 9 h', 'DAY'], p='ptit_dej_table', th='bx'),
   dict(k='BEAU MAIS FRAIS', t=['Un cappuccino', 'au soleil'], i=['Viennoiseries du jour', 'DAY'], p='matcha_viennoiseries', th='cr'),
 ],
}

# ---------- registre des photos : jamais deux fois la même photo sur la même plateforme ----------
# Plusieurs fichiers d'une même prise de vue comptent comme une seule photo (même groupe).
REGISTRE = os.path.join(REPO, 'social', 'photos-usage.json')
GROUPE = {'oeufs_saumon': 'oeufs_saumon', 'ricotta': 'ricotta', 'egg_muffin': 'egg_muffin',
          'tartine_saumon': 'tartine_saumon', 'matcha_viennoiseries': 'viennoiseries_matcha',
          'viennoiseries_2': 'viennoiseries_matcha', 'ptit_dej_table': 'table_ptit_dej',
          'jus_orange': 'table_ptit_dej', 'ptit_dej_dessus': 'ptit_dej_dessus'}

def deja_utilisees(reseau='instagram'):
    try: reg = json.load(open(REGISTRE))
    except FileNotFoundError: return set()
    return {e['photo'] for e in reg if e['reseau'] == reseau}

def enregistrer(groupe, day, publication, reseau='instagram'):
    try: reg = json.load(open(REGISTRE))
    except FileNotFoundError: reg = []
    reg.append(dict(photo=groupe, reseau=reseau, date=day.isoformat(), publication=publication))
    json.dump(reg, open(REGISTRE, 'w'), ensure_ascii=False, indent=1)

def day_line(wd):
    return 'Ce soir, cocktails jusqu’à 1 h' if wd in (4, 5) else 'Ouvert jusqu’à 20 h 30'

def choose(cat, day):
    opts = BANK[cat]
    if day.weekday() not in (1, 2, 3):  # pas de variante télétravail le vendredi / samedi
        opts = [o for o in opts if not o.get('bureau')] or opts
    # Règle MOKA : la story météo est toujours en texte + logo, sans photo.
    return opts[day.toordinal() % len(opts)], False

def render(day, m):
    cat = categorie(m); v, avec_photo = choose(cat, day)
    fmt = lambda s: s.replace('{tmin}', str(round(m['tmin']))).replace('{tmax}', str(round(m['tmax'])))
    kicker = fmt(v['k']); title = [fmt(x) for x in v['t']]
    title[-1] = title[-1].rstrip('.')
    info = [day_line(day.weekday()) if x == 'DAY' else fmt(x) for x in v['i']]
    T = THEMES[v['th'] if avec_photo else 'bx']; W, H, PH = 1080, 1920, 820
    im = Image.new('RGB', (W, H), T['bg'])
    if avec_photo:
        ph = ImageOps.exif_transpose(Image.open(os.path.join(HERE, 'photos', v['p'] + '.jpg'))).convert('RGB')
        im.paste(cover(ph, W, PH, 0.55), (0, 0))
        y, tmax = PH + 100, 170
    else:
        y, tmax = 480, 230  # story texte seule, centrée
    d = ImageDraw.Draw(im)
    C(d, y, kicker, sans(fit(d, kicker, sans, 46, 960), 700), T['acc']); y += 145 if avec_photo else 200
    ts = min(fit(d, t, ft, tmax, 960) for t in title)
    for t in title: C(d, y, t, ft(ts), T['ink']); y += int(ts * 0.98)
    y += 10
    for s in info: C(d, y, s, sans(fit(d, s, lambda z: sans(z, 650), 60 if avec_photo else 66, 960), 650), T['ink']); y += 84 if avec_photo else 92
    wm = wordmark(170, T['ink']); im.paste(wm, ((W - wm.width) // 2, H - 230), wm)
    C(d, H - 120, '6 rue Vaugelas · Annecy', sans(36, 500), T['soft'])
    os.makedirs(OUT_DIR, exist_ok=True)
    fn = os.path.join(OUT_DIR, f'{day.isoformat()}.jpg'); im.save(fn, quality=92)
    k = (kicker[:1] + kicker[1:].lower()).replace('annecy', 'Annecy')
    parts = [k, ' '.join(title)] + info
    alt = norm(' '.join(p if p.endswith(('?', '!', '.')) else p + '.' for p in parts))
    return dict(file=os.path.relpath(fn, REPO), alt=alt, categorie=cat, meteo=m,
                photo=GROUPE[v['p']] if avec_photo else None)

if __name__ == '__main__':
    a = argparse.ArgumentParser()
    a.add_argument('--date'); a.add_argument('--code', type=int)
    a.add_argument('--tmin', type=float); a.add_argument('--tmax', type=float); a.add_argument('--pp', type=float, default=0)
    a = a.parse_args()
    day = dt.date.fromisoformat(a.date) if a.date else dt.date.today()
    if day.weekday() in (6, 0):
        print(json.dumps({'skip': 'MOKA est fermé le dimanche et le lundi'})); sys.exit(2)
    m = dict(code=a.code, tmin=a.tmin, tmax=a.tmax, pp=a.pp) if a.code is not None else fetch(day.isoformat())
    print(json.dumps(render(day, m), ensure_ascii=False))
