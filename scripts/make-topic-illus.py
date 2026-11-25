"""Draws the offline topic pictures for Reels (no API needed): admin/illus/<emoji-code>.webp, 900×600.
Neutral pictures per question family — they never show an answer. Run: python3 scripts/make-topic-illus.py"""
import os, math, random
OUT = os.path.join(os.path.dirname(__file__), '..', 'admin', 'illus'); os.makedirs(OUT, exist_ok=True)
W, H = 900, 600
def code(e): return '-'.join(f'{ord(c):x}' for c in e)

def frame(bg1, bg2, body):
    R = random.Random(bg1)
    blobs = ''.join(f'<circle cx="{R.randint(0,W)}" cy="{R.randint(0,H)}" r="{R.randint(60,160)}" fill="#fff" opacity="{R.uniform(.12,.3):.2f}"/>' for _ in range(6))
    sparkles = ''.join(f'<path transform="translate({R.randint(40,W-40)} {R.randint(30,H-30)}) scale({R.uniform(.5,1.1):.2f})" d="M0-14 L4-4 14 0 4 4 0 14-4 4-14 0-4-4Z" fill="#fff" opacity=".85"/>' for _ in range(7))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{bg1}"/><stop offset="1" stop-color="{bg2}"/></linearGradient>
<radialGradient id="gl" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".5" stop-color="#fff" stop-opacity=".15"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<filter id="sh" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#3b2a6b" flood-opacity=".22"/></filter>
<filter id="soft"><feGaussianBlur stdDeviation="2"/></filter>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg)"/>{blobs}
<ellipse cx="450" cy="545" rx="300" ry="26" fill="#3b2a6b" opacity=".10"/>
<g filter="url(#sh)">{body}</g>{sparkles}</svg>'''

def ball(x, y, r, c1, c2):
    gid = f'b{x}{y}{r}'.replace('.', '')
    return (f'<radialGradient id="{gid}" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></radialGradient>'
            f'<circle cx="{x}" cy="{y}" r="{r}" fill="url(#{gid})"/><ellipse cx="{x - r*.3}" cy="{y - r*.38}" rx="{r*.32}" ry="{r*.2}" fill="#fff" opacity=".55"/>')
def block(x, y, w, h, c, d=22):
    top = f'<path d="M{x} {y} l{d} {-d} h{w} l{-d} {d}Z" fill="{c}" opacity=".75"/>'
    side = f'<path d="M{x+w} {y} l{d} {-d} v{h} l{-d} {d}Z" fill="#000" opacity=".12"/><path d="M{x+w} {y} l{d} {-d} v{h} l{-d} {d}Z" fill="{c}" opacity=".7"/>'
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{c}"/>{top}{side}<rect x="{x+8}" y="{y+8}" width="{w*.35}" height="{h*.18}" rx="5" fill="#fff" opacity=".35"/>'
COLS = ['#8b5cf6', '#ec4899', '#22c55e', '#f59e0b', '#3b82f6', '#06b6d4', '#ef4444']

P = {}
# 🤯 blocks of different heights in a row
P['🤯'] = ('#fde68a', '#fbcfe8', ''.join(block(170 + i*120, 520 - h, 90, h, COLS[i]) for i, h in enumerate([150, 260, 110, 320, 200])))
# ➕ two marble piles
P['➕'] = ('#bbf7d0', '#bfdbfe', ''.join(ball(250 + (i % 3)*55 - (i//3)*28, 460 - (i//3)*48, 30, '#fff', COLS[i % 7]) for i in range(6)) +
           ''.join(ball(560 + (i % 3)*55 - (i//3)*28, 460 - (i//3)*48, 30, '#fff', COLS[(i+3) % 7]) for i in range(6)) +
           '<g stroke="#fff" stroke-width="22" stroke-linecap="round" opacity=".9"><path d="M450 250v90M405 295h90"/></g>')
# ➖ tower losing blocks
P['➖'] = ('#fecaca', '#fde68a', ''.join(block(330, 520 - (i+1)*70, 150, 70, COLS[i]) for i in range(4)) +
           f'<g transform="rotate(18 640 160)">{block(600, 120, 110, 60, COLS[5])}</g><g transform="rotate(-14 230 200)">{block(180, 170, 100, 56, COLS[6])}</g>')
# 🧩 puzzle pieces
def piece(x, y, s, c, rot):
    d = f'M0 0h{s*.38}c0-{s*.18} {s*.24}-{s*.18} {s*.24} 0h{s*.38}v{s*.38}c{s*.18} 0 {s*.18} {s*.24} 0 {s*.24}v{s*.38}h-{s*.38}c0 {s*.18}-{s*.24} {s*.18}-{s*.24} 0h-{s*.38}v-{s*.38}c{s*.18} 0 {s*.18}-{s*.24} 0-{s*.24}Z'
    return f'<g transform="translate({x} {y}) rotate({rot})"><path d="{d}" fill="{c}"/><path d="{d}" fill="url(#gl)"/></g>'
P['🧩'] = ('#f5d0fe', '#bae6fd', piece(190, 210, 170, COLS[0], -12) + piece(400, 160, 170, COLS[1], 8) + piece(610, 230, 150, COLS[2], -6) + piece(330, 360, 140, COLS[3], 14))
# 🧮 abacus
ab = '<rect x="200" y="140" width="500" height="360" rx="26" fill="#b45309"/><rect x="226" y="166" width="448" height="308" rx="14" fill="#fef3c7"/>'
for r in range(5):
    y = 205 + r*58; ab += f'<rect x="226" y="{y-4}" width="448" height="8" fill="#92400e"/>'
    for k in range(4 + r % 3): ab += ball(260 + k*48 + (r % 2)*20, y, 21, '#fff', COLS[r])
P['🧮'] = ('#ede9fe', '#fde68a', ab)
# 🎲 dice
def die(x, y, s, rot, n):
    pips = {1: [(0, 0)], 2: [(-1, -1), (1, 1)], 3: [(-1, -1), (0, 0), (1, 1)], 4: [(-1, -1), (1, -1), (-1, 1), (1, 1)], 5: [(-1, -1), (1, -1), (0, 0), (-1, 1), (1, 1)], 6: [(-1, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (1, 1)]}[n]
    p = ''.join(f'<circle cx="{px*s*.27}" cy="{py*s*.27}" r="{s*.09}" fill="#4c1d95"/>' for px, py in pips)
    return f'<g transform="translate({x} {y}) rotate({rot})"><rect x="{-s/2}" y="{-s/2}" width="{s}" height="{s}" rx="{s*.2}" fill="#fff"/><rect x="{-s/2}" y="{-s/2}" width="{s}" height="{s}" rx="{s*.2}" fill="url(#gl)"/>{p}</g>'
P['🎲'] = ('#fbcfe8', '#c7d2fe', die(330, 320, 190, -14, 5) + die(590, 280, 170, 12, 3))
# ⚖️ scale
sc = ('<rect x="440" y="150" width="20" height="330" rx="8" fill="#a16207"/><rect x="360" y="470" width="180" height="34" rx="14" fill="#a16207"/>'
      '<rect x="220" y="160" width="460" height="16" rx="8" fill="#ca8a04" transform="rotate(-4 450 168)"/><circle cx="450" cy="160" r="22" fill="#eab308"/>'
      '<path d="M240 160 L200 300 M240 160 L290 300 M660 145 L610 285 M660 145 L710 285" stroke="#a16207" stroke-width="4"/>'
      '<path d="M180 300 h130 a65 30 0 0 1 -130 0Z" fill="#facc15"/><path d="M590 285 h140 a70 30 0 0 1 -140 0Z" fill="#facc15"/>'
      + ball(230, 270, 30, '#fff', COLS[1]) + ball(270, 278, 24, '#fff', COLS[4]) + ball(650, 258, 32, '#fff', COLS[2]) + ball(695, 266, 24, '#fff', COLS[3]))
P['⚖️'] = ('#e5e7eb', '#ddd6fe', sc)
# 💯 pie
pie = '<ellipse cx="450" cy="330" rx="230" ry="200" fill="#fff"/>'
ang = [0, 80, 150, 230, 300, 360]
for i in range(5):
    a0, a1 = math.radians(ang[i] - 90), math.radians(ang[i+1] - 90)
    x0, y0, x1, y1 = 450 + 190*math.cos(a0), 320 + 165*math.sin(a0), 450 + 190*math.cos(a1), 320 + 165*math.sin(a1)
    pie += f'<path d="M450 320 L{x0:.0f} {y0:.0f} A190 165 0 0 1 {x1:.0f} {y1:.0f}Z" fill="{COLS[i]}" stroke="#fff" stroke-width="6"/>'
P['💯'] = ('#c7d2fe', '#fbcfe8', pie + '<ellipse cx="450" cy="320" rx="190" ry="165" fill="url(#gl)"/>')
# 🔢 crystals
def gem(x, y, s, c):
    return f'<g transform="translate({x} {y})"><path d="M0 {-s} L{s*.8} {-s*.3} L{s*.5} {s} L{-s*.5} {s} L{-s*.8} {-s*.3}Z" fill="{c}"/><path d="M0 {-s} L{s*.8} {-s*.3} L0 {-s*.1} L{-s*.8} {-s*.3}Z" fill="#fff" opacity=".45"/><path d="M0 {-s*.1} L{s*.5} {s} L{-s*.5} {s}Z" fill="#000" opacity=".1"/></g>'
P['🔢'] = ('#ddd6fe', '#a5f3fc', gem(300, 330, 110, COLS[0]) + gem(470, 280, 140, COLS[5]) + gem(640, 350, 100, COLS[1]))
# 🏙️ skyline
sk = '<circle cx="680" cy="200" r="70" fill="#fde68a"/>'
R = random.Random(4)
for i, (x, h, w) in enumerate([(120, 220, 90), (215, 320, 80), (300, 260, 100), (405, 380, 90), (500, 290, 110), (615, 340, 80), (700, 240, 100)]):
    sk += f'<rect x="{x}" y="{520-h}" width="{w}" height="{h}" rx="8" fill="{["#7c3aed","#6d28d9","#8b5cf6","#5b21b6","#7c3aed","#6d28d9","#a78bfa"][i]}"/>'
    for r in range(int(h/45)):
        for c in range(int(w/30)):
            if R.random() < .6: sk += f'<rect x="{x+10+c*28}" y="{530-h+r*42}" width="14" height="20" rx="3" fill="#fde68a" opacity=".85"/>'
P['🏙️'] = ('#fed7aa', '#c4b5fd', sk)
# 🌍 compass on map
cp = ('<rect x="170" y="190" width="560" height="320" rx="20" fill="#fef3c7" transform="rotate(-5 450 350)"/>'
      '<path d="M220 300 q80 -60 160 0 t160 0 t140 -20" stroke="#d6a76c" stroke-width="6" fill="none" stroke-dasharray="14 10" transform="rotate(-5 450 350)"/>'
      '<circle cx="450" cy="300" r="150" fill="#ca8a04"/><circle cx="450" cy="300" r="128" fill="#fff"/><circle cx="450" cy="300" r="128" fill="url(#gl)"/>'
      '<path d="M450 190 L475 300 L450 410 L425 300Z" fill="#ef4444"/><path d="M450 300 L475 300 L450 410 L425 300Z" fill="#64748b"/><circle cx="450" cy="300" r="14" fill="#ca8a04"/>')
P['🌍'] = ('#bfdbfe', '#bbf7d0', cp)
# 📏 ruler + tape
ru = '<rect x="150" y="300" width="600" height="90" rx="12" fill="#facc15" transform="rotate(-8 450 345)"/>'
ru += '<g transform="rotate(-8 450 345)">' + ''.join(f'<rect x="{170+i*29}" y="300" width="4" height="{34 if i % 5 == 0 else 20}" fill="#854d0e"/>' for i in range(20)) + '</g>'
ru += '<circle cx="650" cy="230" r="90" fill="#22c55e"/><circle cx="650" cy="230" r="34" fill="#dcfce7"/><path d="M650 320 h-250 v34 h250Z" fill="#fde047"/>'
P['📏'] = ('#bae6fd', '#fde68a', ru)
# ⏱️ stopwatch + hourglass
sw = ('<circle cx="360" cy="330" r="160" fill="#94a3b8"/><circle cx="360" cy="330" r="138" fill="#fff"/><circle cx="360" cy="330" r="138" fill="url(#gl)"/>'
      '<rect x="340" y="140" width="40" height="40" rx="8" fill="#64748b"/><path d="M360 330 L360 215" stroke="#ef4444" stroke-width="10" stroke-linecap="round"/><circle cx="360" cy="330" r="14" fill="#334155"/>'
      + ''.join(f'<rect x="356" y="200" width="8" height="18" fill="#334155" transform="rotate({k*30} 360 330)"/>' for k in range(12)) +
      '<rect x="560" y="170" width="160" height="26" rx="10" fill="#92400e"/><rect x="560" y="470" width="160" height="26" rx="10" fill="#92400e"/>'
      '<path d="M580 196 h120 q0 80 -55 137 q55 57 55 137 h-120 q0 -80 55 -137 q-55 -57 -55 -137Z" fill="#e0f2fe" opacity=".9"/><path d="M610 440 h60 l12 30 h-84Z" fill="#f59e0b"/><path d="M620 240 h40 l-20 50Z" fill="#f59e0b"/>')
P['⏱️'] = ('#fef3c7', '#c7d2fe', sw)
# 🧪 flasks
def flask(x, c, h):
    return (f'<g transform="translate({x} 0)"><rect x="-22" y="170" width="44" height="90" fill="#e0f2fe" opacity=".9"/><path d="M-22 260 L-95 480 q-6 24 20 24 h150 q26 0 20 -24 L22 260Z" fill="#e0f2fe" opacity=".9"/>'
            f'<path d="M{-60+h} {400-h} L-95 480 q-6 24 20 24 h150 q26 0 20 -24 L{60-h} {400-h}Z" fill="{c}"/>{ball(-20, 440, 12, "#fff", c)}{ball(18, 410, 8, "#fff", c)}<rect x="-30" y="160" width="60" height="16" rx="6" fill="#94a3b8"/></g>')
P['🧪'] = ('#ccfbf1', '#e9d5ff', flask(260, '#ec4899', 0) + flask(450, '#22c55e', 20) + flask(640, '#8b5cf6', 10))
# 👥 three kids of different heights (seen from behind)
def kid(x, h, c):
    return f'<g transform="translate({x} {520-h})"><circle cx="0" cy="40" r="40" fill="#7c4a2d"/><rect x="-55" y="78" width="110" height="{h-140}" rx="40" fill="{c}"/><rect x="-40" y="{h-80}" width="30" height="80" rx="12" fill="#334155"/><rect x="10" y="{h-80}" width="30" height="80" rx="12" fill="#334155"/></g>'
P['👥'] = ('#c7d2fe', '#fbcfe8', kid(280, 300, COLS[0]) + kid(450, 360, COLS[1]) + kid(620, 260, COLS[4]))
# 📅 blank calendar
ca = '<rect x="230" y="140" width="440" height="370" rx="30" fill="#fff"/><rect x="230" y="140" width="440" height="90" rx="30" fill="#ef4444"/><rect x="230" y="200" width="440" height="30" fill="#ef4444"/>'
ca += '<rect x="300" y="115" width="22" height="60" rx="10" fill="#64748b"/><rect x="578" y="115" width="22" height="60" rx="10" fill="#64748b"/>'
for r in range(4):
    for c in range(6): ca += f'<rect x="{262+c*64}" y="{254+r*62}" width="46" height="44" rx="10" fill="{"#fde68a" if (r, c) == (2, 3) else "#ede9fe"}"/>'
P['📅'] = ('#bbf7d0', '#fde68a', ca)
# 🗓️ four-season tree
tr = '<rect x="430" y="330" width="40" height="190" rx="14" fill="#92400e"/>'
for (cx, cy, c) in [(380, 250, '#f9a8d4'), (520, 250, '#4ade80'), (380, 340, '#fb923c'), (520, 340, '#e0f2fe')]: tr += f'<circle cx="{cx}" cy="{cy}" r="95" fill="{c}"/>'
tr += '<circle cx="450" cy="295" r="160" fill="url(#gl)"/>'
P['🗓️'] = ('#fef3c7', '#bae6fd', tr)
# 🔗 chain links
P['🔗'] = ('#f5d0fe', '#c7d2fe', '<rect x="210" y="230" width="300" height="150" rx="75" fill="none" stroke="#8b5cf6" stroke-width="46"/><rect x="390" y="230" width="300" height="150" rx="75" fill="none" stroke="#ec4899" stroke-width="46"/><rect x="390" y="230" width="120" height="40" fill="#8b5cf6"/>')
# 🔍 magnifier over shapes
mg = ''.join(ball(230 + i*110, 420, 42, '#fff', COLS[i]) for i in range(5))
mg += '<circle cx="470" cy="270" r="130" fill="#e0f2fe" opacity=".55" stroke="#475569" stroke-width="26"/><circle cx="470" cy="270" r="130" fill="url(#gl)"/><rect x="560" y="360" width="40" height="160" rx="18" fill="#7c2d12" transform="rotate(-40 580 440)"/>'
P['🔍'] = ('#bae6fd', '#fbcfe8', mg)
# ❓ mystery box
P['❓'] = ('#ede9fe', '#fde68a', '<circle cx="450" cy="300" r="210" fill="#fff" opacity=".45"/>' + block(320, 280, 220, 200, '#8b5cf6', 40) + '<rect x="410" y="240" width="40" height="240" fill="#fde047"/><path d="M430 240 q-90 -90 -20 -100 q40 0 20 100 q-20 -100 20 -100 q70 10 -20 100Z" fill="#fde047"/>')
# 🕰️ wall clock (hands overlapped at the top — no readable time)
ck = '<circle cx="450" cy="300" r="190" fill="#7c3aed"/><circle cx="450" cy="300" r="165" fill="#fff"/><circle cx="450" cy="300" r="165" fill="url(#gl)"/>'
ck += ''.join(f'<circle cx="{450+140*math.sin(math.radians(k*30)):.0f}" cy="{300-140*math.cos(math.radians(k*30)):.0f}" r="{9 if k % 3 == 0 else 5}" fill="#4c1d95"/>' for k in range(12))
ck += '<path d="M450 300 V170" stroke="#1e1b4b" stroke-width="14" stroke-linecap="round"/><circle cx="450" cy="300" r="16" fill="#ec4899"/>'
P['🕰️'] = ('#fed7aa', '#ddd6fe', ck)
# 🕵️ detective hat + magnifier
P['🕵️'] = ('#fde68a', '#c4b5fd', '<ellipse cx="400" cy="380" rx="230" ry="60" fill="#78350f"/><path d="M260 380 q20 -200 140 -210 q120 10 140 210Z" fill="#92400e"/><rect x="262" y="330" width="276" height="34" fill="#451a03"/>'
           '<circle cx="640" cy="260" r="90" fill="#e0f2fe" opacity=".6" stroke="#475569" stroke-width="20"/><circle cx="640" cy="260" r="90" fill="url(#gl)"/><rect x="700" y="330" width="30" height="130" rx="14" fill="#7c2d12" transform="rotate(-35 715 395)"/>')
# 💰 piggy bank + coins
pg = '<ellipse cx="420" cy="340" rx="210" ry="150" fill="#f9a8d4"/><ellipse cx="420" cy="340" rx="210" ry="150" fill="url(#gl)"/><circle cx="610" cy="330" r="50" fill="#f472b6"/><circle cx="600" cy="320" r="8" fill="#9d174d"/><circle cx="624" cy="320" r="8" fill="#9d174d"/>'
pg += '<circle cx="540" cy="260" r="12" fill="#1f2937"/><path d="M330 205 l30 -50 l30 50Z" fill="#f472b6"/><rect x="300" y="460" width="40" height="60" rx="14" fill="#f472b6"/><rect x="480" y="460" width="40" height="60" rx="14" fill="#f472b6"/><rect x="370" y="190" width="90" height="14" rx="7" fill="#9d174d"/>'
pg += ''.join(f'<ellipse cx="{170+i*30}" cy="{500-i*16}" rx="46" ry="16" fill="#facc15" stroke="#ca8a04" stroke-width="4"/>' for i in range(4))
P['💰'] = ('#bbf7d0', '#fde68a', pg)
# 🎂 cake
cake = '<ellipse cx="450" cy="470" rx="250" ry="40" fill="#fff"/><rect x="250" y="330" width="400" height="140" rx="20" fill="#f9a8d4"/><rect x="290" y="230" width="320" height="110" rx="18" fill="#c4b5fd"/>'
cake += '<path d="M250 350 q25 30 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" fill="#fff"/>'
cake += ''.join(f'<rect x="{330+i*60}" y="170" width="16" height="64" rx="6" fill="{COLS[i]}"/><path d="M{338+i*60} 140 q14 18 0 30 q-14 -12 0 -30Z" fill="#f59e0b"/>' for i in range(5))
P['🎂'] = ('#fecaca', '#ddd6fe', cake)
# generic: brain + light bulb
gn = '<path d="M450 150 a130 120 0 0 1 120 190 h-240 a130 120 0 0 1 120 -190Z" fill="#fde047"/><circle cx="450" cy="250" r="120" fill="#fde047"/><circle cx="450" cy="250" r="120" fill="url(#gl)"/>'
gn += '<rect x="400" y="360" width="100" height="70" rx="14" fill="#94a3b8"/><rect x="410" y="430" width="80" height="24" rx="10" fill="#64748b"/>'
gn += ''.join(f'<rect x="446" y="60" width="8" height="40" rx="4" fill="#fff" transform="rotate({k*30-90} 450 250)"/>' for k in range(7))
P['generic'] = ('#c7d2fe', '#fbcfe8', gn)

if __name__ == '__main__':
    import subprocess, json
    files = []
    for e, (c1, c2, body) in P.items():
        name = 'generic' if e == 'generic' else code(e)
        open(os.path.join(OUT, name + '.svg'), 'w').write(frame(c1, c2, body)); files.append(name)
    json.dump(files, open(os.path.join(OUT, 'index.json'), 'w'))
    print(len(files), 'svg written')
