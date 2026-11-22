"""Procedural background tracks for iqtest.live quiz reels (original, generated from scratch).
Each track is an exact number of bars so it loops seamlessly."""
import numpy as np, sys
from scipy.signal import butter, sosfilt
SR = 44100
rng = np.random.default_rng(7)

def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'highpass', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'lowpass', fs=SR, output='sos'), x)
def hz(n): return 440 * 2 ** ((n - 69) / 12)
def env(n, a, d, sus=0.0):
    t = np.arange(n) / SR; e = np.exp(-t / max(d, 1e-4)) * (1 - sus) + sus
    na = int(a * SR)
    if na: e[:na] *= np.linspace(0, 1, na)
    return e

def place(buf, x, t):
    i = int(round(t * SR)) % len(buf); n = len(x)
    if i + n <= len(buf): buf[i:i + n] += x
    else: k = len(buf) - i; buf[i:] += x[:k]; buf[:n - k] += x[k:]   # wrap → seamless loop

def kick(punch=1.0):
    n = int(.42 * SR); t = np.arange(n) / SR
    f = 46 + 120 * np.exp(-t * 32); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 7.5) + punch * .5 * np.sin(ph * 2) * np.exp(-t * 60)
    click = hp(rng.standard_normal(n), 2500) * np.exp(-t * 400) * .25
    return np.tanh((x + click) * 1.6) * .9

def clap():
    n = int(.35 * SR); t = np.arange(n) / SR; nz = bp(rng.standard_normal(n), 900, 5200)
    e = np.zeros(n)
    for o in (0, .011, .022): k = int(o * SR); e[k:] += np.exp(-(t[:n - k]) * 38)
    e += np.exp(-t * 9) * .35
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * .35
    return (nz * e * .55 + body) * .8

def hat(open_=False):
    n = int((.22 if open_ else .05) * SR); t = np.arange(n) / SR
    x = hp(rng.standard_normal(n), 7500, 3) * np.exp(-t * (14 if open_ else 95))
    return x * (.22 if open_ else .3)

def cowbell(note, dur=.16):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(note)
    sq = lambda fr: np.sign(np.sin(2 * np.pi * fr * t))
    x = (sq(f) + sq(f * 1.4836)) * .5
    x = bp(x, f * .8, min(f * 4.5, 15000)) * np.exp(-t * 16)
    return np.tanh(x * 2.2) * .38

def bass808(note, dur, glide_from=None):
    n = int(dur * SR); t = np.arange(n) / SR; f1 = hz(note)
    f = np.full(n, f1)
    if glide_from is not None:
        g = int(.07 * SR); f[:g] = np.linspace(hz(glide_from), f1, g)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * env(n, .004, dur * .9, .0)
    x[-int(.02 * SR):] *= np.linspace(1, 0, int(.02 * SR))
    return np.tanh(x * 2.4) * .55

def supersaw(notes, dur, cut=3000, vol=.12):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for nt in notes:
        for d in (-.12, -.05, 0, .05, .12):
            fr = hz(nt) * 2 ** (d / 12); ph = rng.random()
            x += 2 * ((fr * t + ph) % 1) - 1
    x = lp(x / (len(notes) * 5), cut)
    e = env(n, .01, 9, .0); e[-int(.05 * SR):] *= np.linspace(1, 0, int(.05 * SR))
    return x * e * vol

def pluck(note, dur=.22, bright=6000, vol=.2):
    n = int(dur * SR); t = np.arange(n) / SR; fr = hz(note)
    x = (2 * ((fr * t) % 1) - 1) + .5 * (2 * ((fr * 2.005 * t) % 1) - 1)
    return lp(x, bright) * np.exp(-t * 14) * vol

def sidechain(L, beats, depth=.6, bpm=130):
    g = np.ones(L); spb = 60 / bpm; n = int(spb * .45 * SR); curve = 1 - depth * np.exp(-np.linspace(0, 5, n))
    for b in beats:
        i = int(round(b * spb * SR)) % L; k = min(n, L - i); g[i:i + k] = np.minimum(g[i:i + k], curve[:k])
    return g

def master(x, target_rms_db=-15.5):
    x = hp(x, 28); x = np.tanh(x * 1.15)
    rms = np.sqrt(np.mean(x ** 2)); x *= 10 ** (target_rms_db / 20) / rms
    pk = np.max(np.abs(x))
    if pk > .97: x = np.tanh(x / pk * 1.2) / np.tanh(1.2) * .97
    return x

# ---------------- track 1: phonk (130 BPM, F minor) ----------------
def phonk():
    bpm = 130; spb = 60 / bpm; bars = 16; L = int(round(bars * 4 * spb * SR))
    dr, bs, cb, pad = (np.zeros(L) for _ in range(4)); s16 = spb / 4
    kick_pat = [0, 1.5, 2.75]  # per bar, in beats
    for b in range(bars):
        o = b * 4
        for k in kick_pat: place(dr, kick(), (o + k) * spb)
        if b % 4 == 3: place(dr, kick(.6), (o + 3.5) * spb)
        place(dr, clap(), (o + 2) * spb)            # half-time snare
        for s in range(16):                          # hats + rolls
            if b % 2 == 1 and s >= 12: place(dr, hat() * .8, (o * 4 + 12 + (s - 12) * 2 / 3) * s16)
            elif s % 2 == 0 or (s % 4 == 3 and b % 2 == 0): place(dr, hat() * (1 if s % 4 == 0 else .7), (o * 4 + s) * s16)
        place(dr, hat(True), (o + 3.5) * spb)
    # 808 line (F minor): F, Db, Eb, C  — two-bar cells with glides
    roots = [29, 29, 25, 25, 27, 27, 24, 26]
    for b in range(bars):
        r = roots[b % 8]; prev = roots[(b - 1) % 8]
        place(bs, bass808(r, spb * 1.45, prev if prev != r else None), b * 4 * spb)
        place(bs, bass808(r, spb * .9), (b * 4 + 1.5) * spb)
        place(bs, bass808(r + 12 if b % 2 else r, spb * 1.2), (b * 4 + 2.75) * spb)
    # cowbell hook (F minor pentatonic), A and B phrases
    A = [(0, 77), (.75, 80), (1.5, 77), (2, 84), (2.5, 82), (3, 80), (3.5, 77)]
    B = [(0, 75), (.75, 77), (1.5, 80), (2, 82), (2.5, 80), (3, 77), (3.25, 75), (3.5, 72)]
    for b in range(bars):
        if b < 2: continue  # intro: drums + bass only
        for (t0, nt) in (A if (b // 2) % 2 == 0 else B):
            place(cb, cowbell(nt), (b * 4 + t0) * spb)
            place(cb, cowbell(nt + 12) * .25, (b * 4 + t0 + .5 / 4) * spb)  # ghost echo
    # dark pad
    chords = [[53, 56, 60], [49, 53, 56], [51, 55, 58], [48, 51, 55]]
    for b in range(0, bars, 2): place(pad, supersaw(chords[(b // 2) % 4], spb * 8, 1400, .08), b * 4 * spb)
    beats = [b * 4 + k for b in range(bars) for k in kick_pat]
    sc = sidechain(L, beats, .55, bpm)
    mix = dr * 1.0 + bs * sc * 1.0 + cb * sc * .9 + pad * sidechain(L, beats, .8, bpm)
    return master(mix)

# ---------------- track 2: future bass / bright game show (128 BPM, A minor → C) ----------------
def future():
    bpm = 128; spb = 60 / bpm; bars = 16; L = int(round(bars * 4 * spb * SR))
    dr, bs, ch, ld = (np.zeros(L) for _ in range(4)); s16 = spb / 4
    for b in range(bars):
        o = b * 4
        for k in (0, 2.5): place(dr, kick(), (o + k) * spb)
        place(dr, clap(), (o + 1) * spb); place(dr, clap(), (o + 3) * spb)
        for s in range(16):
            if s % 2 == 1: place(dr, hat() * .8, (o * 4 + s) * s16)
        if b % 4 == 3:
            for s in range(8): place(dr, clap() * (.25 + s * .07), (o + 2 + s / 4) * spb)  # snare build
    prog = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]]  # Am7 Fmaj7 Cmaj7 G7
    for b in range(bars):
        c = prog[(b // 2) % 4] if True else None
        for k in (0, .75, 1.5, 2.5, 3, 3.5):  # chopped future-bass chords
            place(ch, supersaw(c, spb * .5, 5200, .16), (b * 4 + k) * spb)
        place(bs, bass808(c[0] - 24, spb * 1.4), b * 4 * spb); place(bs, bass808(c[0] - 24, spb * 1.2), (b * 4 + 2.5) * spb)
    mel = [76, 79, 81, 79, 76, 74, 72, 74, 76, 79, 84, 83, 81, 79, 76, 79]
    for b in range(2, bars):
        for i in range(8): place(ld, pluck(mel[(b * 8 + i) % 16], .2, 7000, .16), (b * 4 + i * .5) * spb)
    beats = [b * 4 + k for b in range(bars) for k in (0, 1, 2, 3)]
    sc = sidechain(L, beats, .6, bpm)
    return master(dr + bs * sc + ch * sc * 1.1 + ld * .9)


def marimba(note, dur=.35, vol=.22):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(note)
    x = np.sin(2 * np.pi * f * t) + .35 * np.sin(2 * np.pi * f * 3.98 * t) * np.exp(-t * 40)
    return x * np.exp(-t * 11) * vol

def shaker():
    n = int(.07 * SR); t = np.arange(n) / SR
    return bp(rng.standard_normal(n), 5000, 11000) * np.sin(np.pi * t / t[-1]) * .14

def conga(note, vol=.35):
    n = int(.25 * SR); t = np.arange(n) / SR; f = hz(note) * (1 + .4 * np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 18) * vol

def tick(hi=True):
    n = int(.03 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (2600 if hi else 1700) * t) + hp(rng.standard_normal(n), 4000) * .3) * np.exp(-t * 180) * .28

def arp_square(note, dur, vol=.09, cut=4500):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(note)
    x = np.sign(np.sin(2 * np.pi * f * t)) * .7 + (2 * ((f * 1.003 * t) % 1) - 1) * .3
    return lp(x, cut) * np.exp(-t * 9) * vol

# ---------------- track 3: afro house (122 BPM, D minor) ----------------
def afro():
    bpm = 122; spb = 60 / bpm; bars = 16; L = int(round(bars * 4 * spb * SR))
    dr, pc, bs, mr, pad = (np.zeros(L) for _ in range(5)); s16 = spb / 4
    for b in range(bars):
        o = b * 4
        for k in range(4): place(dr, kick(.7) * .9, (o + k) * spb)
        for k in (1, 3): place(dr, clap() * .6, (o + k) * spb)
        for s in range(16):
            place(pc, shaker() * (1 if s % 2 else .6), (o * 4 + s) * s16)
            if s in (2, 6, 10, 14): place(dr, hat(True) * .55, (o * 4 + s) * s16)
        for (s, nt) in ((3, 62), (6, 57), (7, 57), (11, 62), (13, 60), (14, 57)): place(pc, conga(nt), (o * 4 + s) * s16)
    roots = [38, 38, 34, 34, 36, 36, 33, 33]   # Dm Bb C A
    for b in range(bars):
        r = roots[b % 8]
        for (k, d, oc) in ((0, .7, 0), (1.5, .4, 12), (2.5, .7, 0), (3.5, .4, 7)): place(bs, bass808(r + oc, spb * d) * .75, (b * 4 + k) * spb)
    hook = [(0, 74), (.5, 77), (1, 81), (1.75, 79), (2.5, 77), (3, 74), (3.5, 72)]
    for b in range(2, bars):
        for (t0, nt) in hook: place(mr, marimba(nt + (0 if b % 4 < 2 else -2)), (b * 4 + t0) * spb)
    ch = [[62, 65, 69], [58, 62, 65], [60, 64, 67], [57, 61, 64]]
    for b in range(0, bars, 2): place(pad, supersaw(ch[(b // 2) % 4], spb * 8, 1800, .06), b * 4 * spb)
    beats = [b * 4 + k for b in range(bars) for k in range(4)]
    sc = sidechain(L, beats, .5, bpm)
    return master(dr + pc + bs * sc + mr + pad * sc)

# ---------------- track 4: game-show tension with ticking (120 BPM, E minor) ----------------
def tension():
    bpm = 120; spb = 60 / bpm; bars = 16; L = int(round(bars * 4 * spb * SR))
    dr, tk, bs, ar, pad = (np.zeros(L) for _ in range(5)); s16 = spb / 4
    for b in range(bars):
        o = b * 4
        for k in (0, 2): place(dr, kick(), (o + k) * spb)
        if b % 2: place(dr, kick(.5) * .7, (o + 3.5) * spb)
        place(dr, clap() * .8, (o + 1) * spb); place(dr, clap() * .8, (o + 3) * spb)
        for s in range(16): place(tk, tick(s % 4 == 0), (o * 4 + s) * s16)   # clock-like ticking
    for b in range(bars):
        r = 28 if b % 4 < 3 else 31   # E, then G
        for s in range(0, 16, 2): place(bs, bass808(r + (12 if s % 8 == 6 else 0), s16 * 1.8) * .7, (b * 16 + s) * s16)
    seq = [64, 67, 71, 74, 71, 67, 64, 67]
    for b in range(4, bars):
        up = 0 if b < 12 else 2
        for i in range(16): place(ar, arp_square(seq[i % 8] + 12 + up, s16 * .9), (b * 16 + i) * s16)
    for b in range(0, bars, 4): place(pad, supersaw([52, 55, 59, 62], spb * 16, 1200, .07), b * 4 * spb)
    beats = [b * 4 + k for b in range(bars) for k in (0, 2)]
    sc = sidechain(L, beats, .5, bpm)
    return master(dr + tk + bs * sc + ar * sc + pad)

# ---------------- track 5: synthwave arcade (118 BPM, C minor) ----------------
def arcade():
    bpm = 118; spb = 60 / bpm; bars = 16; L = int(round(bars * 4 * spb * SR))
    dr, bs, ar, ld, pad = (np.zeros(L) for _ in range(5)); s16 = spb / 4
    for b in range(bars):
        o = b * 4
        for k in (0, 1, 2, 3): place(dr, kick(.8) * .85, (o + k) * spb)
        for k in (1, 3): place(dr, clap(), (o + k) * spb)
        for s in range(16):
            if s % 2 == 1: place(dr, hat(s % 4 == 3) * .7, (o * 4 + s) * s16)
    prog = [[48, 51, 55], [44, 48, 51], [46, 50, 53], [43, 47, 50]]   # Cm Ab Bb G
    for b in range(bars):
        c = prog[(b // 2) % 4]
        for s in range(16): place(bs, arp_square(c[0] - 12 + (12 if s % 2 else 0), s16 * .95, .2, 1200), (b * 16 + s) * s16)
        for s in range(16): place(ar, arp_square(c[s % 3] + 24, s16 * .9, .06, 6000), (b * 16 + s) * s16)
        if b % 2 == 0: place(pad, supersaw([n + 12 for n in c], spb * 8, 2400, .07), b * 4 * spb)
    mel = [(0, 79), (1, 75), (1.5, 74), (2, 72), (3, 74), (4, 75), (5, 77), (6, 79), (7, 82)]
    for b in range(4, bars, 2):
        for (t0, nt) in mel: place(ld, pluck(nt, .3, 5000, .14), (b * 4 + t0) * spb)
    beats = [b * 4 + k for b in range(bars) for k in range(4)]
    sc = sidechain(L, beats, .55, bpm)
    return master(dr + bs * sc + ar * sc + ld + pad * sc)

def rim():
    n = int(.06 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1700 * t) * .6 + bp(rng.standard_normal(n), 1500, 6000) * .5) * np.exp(-t * 90) * .4

def epiano(notes, dur, vol=.09):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for nt in notes:
        f = hz(nt); x += np.sin(2 * np.pi * f * t + .8 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 3))
    e = env(n, .005, dur * .8); e[-int(.04 * SR):] *= np.linspace(1, 0, int(.04 * SR))
    return lp(x / len(notes), 3000) * e * vol

# ---------------- track 6: reggaeton / dembow (96 BPM, A minor) ----------------
def reggaeton():
    bpm = 96; spb = 60 / bpm; bars = 12; L = int(round(bars * 4 * spb * SR))
    dr, bs, ld, pad = (np.zeros(L) for _ in range(4)); s16 = spb / 4
    for b in range(bars):
        o = b * 4
        for k in range(4): place(dr, kick(.6) * .85, (o + k) * spb)
        for k in range(4):
            for off in (.75, 1.5): place(dr, rim() if off == .75 else clap() * .55, (o + k + off / 2) * spb)  # dembow: snare at 3/16 and 6/16 of each beat
        for s in range(16):
            if s % 2 == 1: place(dr, hat() * .5, (o * 4 + s) * s16)
    prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
    for b in range(bars):
        c = prog[b % 4]
        place(bs, bass808(c[0] - 24, spb * 1.7) * .8, b * 4 * spb); place(bs, bass808(c[0] - 24, spb * 1.7) * .8, (b * 4 + 2) * spb)
        place(pad, epiano(c, spb * 4), b * 4 * spb)
    mel = [(0, 76), (.5, 76), (.75, 74), (1.25, 72), (2, 69), (2.5, 72), (3, 74)]
    for b in range(2, bars):
        for (t0, nt) in mel: place(ld, pluck(nt - (0 if b % 2 == 0 else 2), .25, 4500, .15), (b * 4 + t0) * spb)
    beats = [b * 4 + k for b in range(bars) for k in range(4)]
    sc = sidechain(L, beats, .45, bpm)
    return master(dr + bs * sc + ld + pad * sc)

# ---------------- track 7: drill (142 BPM, G minor, sliding 808s, triplet hats) ----------------
def drill():
    bpm = 142; spb = 60 / bpm; bars = 16; L = int(round(bars * 4 * spb * SR))
    dr, bs, ld, pad = (np.zeros(L) for _ in range(4)); s16 = spb / 4
    for b in range(bars):
        o = b * 4
        for k in (0, 2.5): place(dr, kick() * .8, (o + k) * spb)
        place(dr, clap(), (o + 1) * spb); place(dr, clap(), (o + 3) * spb)
        if b % 2: place(dr, clap() * .45, (o + 3.75) * spb)
        for i in range(12):   # triplet hats
            if i % 3 != 1 or b % 2: place(dr, hat() * (.9 if i % 3 == 0 else .55), (o + i / 3) * spb)
    seq = [(0, 31, None), (1.5, 31, None), (2.5, 34, 31), (3.25, 29, 34)]
    for b in range(bars):
        for (k, nt, gl) in seq: place(bs, bass808(nt - (2 if b % 4 == 3 else 0), spb * .9, gl), (b * 4 + k) * spb)
    mel = [(0, 67), (.5, 70), (1, 74), (1.5, 72), (2, 70), (3, 69)]
    for b in range(2, bars):
        for (t0, nt) in mel: place(ld, marimba(nt + 12 - (2 if b % 4 >= 2 else 0), .4, .14), (b * 4 + t0) * spb)
    for b in range(0, bars, 4): place(pad, supersaw([55, 58, 62], spb * 16, 1000, .07), b * 4 * spb)
    beats = [b * 4 + k for b in range(bars) for k in (0, 2.5)]
    sc = sidechain(L, beats, .45, bpm)
    return master(dr + bs * sc + ld + pad)

# ---------------- track 8: lo-fi chill (86 BPM, F major 7ths) ----------------
def lofi():
    bpm = 86; spb = 60 / bpm; bars = 12; L = int(round(bars * 4 * spb * SR))
    dr, bs, ky, ld = (np.zeros(L) for _ in range(4)); s16 = spb / 4
    for b in range(bars):
        o = b * 4
        for k in (0, 1.75, 2.5): place(dr, lp(kick(.3), 3000) * .8, (o + k) * spb)
        for k in (1, 3): place(dr, lp(clap(), 5000) * .55, (o + k + .03) * spb)
        for s in range(8): place(dr, hat() * (.45 if s % 2 else .3), (o + s / 2 + (.06 if s % 2 else 0)) * spb)  # swing
    prog = [[53, 57, 60, 64], [50, 53, 57, 60], [46, 50, 53, 57], [48, 52, 55, 58]]  # Fmaj7 Dm7 Bbmaj7 C7
    for b in range(bars):
        c = prog[b % 4]; place(ky, epiano(c, spb * 3.9, .14), b * 4 * spb)
        place(bs, lp(bass808(c[0] - 12, spb * 1.8), 400) * .9, b * 4 * spb); place(bs, lp(bass808(c[0] - 12, spb * 1.2), 400) * .8, (b * 4 + 2.5) * spb)
    mel = [(0, 72), (.5, 74), (1, 77), (2, 76), (2.75, 74), (3.5, 72)]
    for b in range(4, bars, 2):
        for (t0, nt) in mel: place(ld, marimba(nt, .5, .12), (b * 4 + t0) * spb)
    crackle = np.zeros(L); idx = rng.integers(0, L, 900); crackle[idx] = rng.standard_normal(900) * .25
    return master(dr + bs + ky + ld + hp(crackle, 2000))

# ---------------- track 9: jersey club (140 BPM, bouncy kicks, C minor) ----------------
def jersey():
    bpm = 140; spb = 60 / bpm; bars = 16; L = int(round(bars * 4 * spb * SR))
    dr, bs, ch, ld = (np.zeros(L) for _ in range(4)); s16 = spb / 4
    pat = [0, 1, 2, 2.5, 3, 3.5]   # classic jersey kick rhythm (beats within bar, second half bouncy)
    for b in range(bars):
        o = b * 4
        for k in pat: place(dr, kick(.9) * .85, (o + k) * spb)
        for k in (1, 3): place(dr, clap(), (o + k) * spb)
        for s in range(16):
            if s % 2 == 1: place(dr, hat() * .6, (o * 4 + s) * s16)
    prog = [[60, 63, 67], [56, 60, 63], [58, 62, 65], [55, 59, 62]]
    for b in range(bars):
        c = prog[(b // 2) % 4]
        for k in (0, .5, 1.5, 2.5, 3.25): place(ch, supersaw(c, spb * .35, 4800, .14), (b * 4 + k) * spb)
        place(bs, bass808(c[0] - 24, spb * 1.4) * .8, b * 4 * spb)
    mel = [84, 82, 79, 82, 84, 87, 84, 79]
    for b in range(4, bars):
        for i in range(8): place(ld, pluck(mel[i] - (0 if b % 4 < 2 else 3), .14, 8000, .1), (b * 4 + i * .5) * spb)
    beats = [b * 4 + k for b in range(bars) for k in pat]
    sc = sidechain(L, beats, .5, bpm)
    return master(dr + bs * sc + ch * sc + ld)

# ---------------- track 10: dark trap (140 BPM half-time, B minor, bells) ----------------
def trap():
    bpm = 140; spb = 60 / bpm; bars = 16; L = int(round(bars * 4 * spb * SR))
    dr, bs, bl, pad = (np.zeros(L) for _ in range(4)); s16 = spb / 4
    for b in range(bars):
        o = b * 4
        for k in (0, .75, 2.5) if b % 2 == 0 else (0, 1.75, 2.25): place(dr, kick() * .85, (o + k) * spb)
        place(dr, clap(), (o + 2) * spb)
        for s in range(16):
            if b % 4 == 3 and s >= 8: place(dr, hat() * .7, (o * 4 + 8 + (s - 8) / 2) * s16)  # 32nd roll
            elif s % 2 == 0: place(dr, hat() * (.9 if s % 4 == 0 else .6), (o * 4 + s) * s16)
    for b in range(bars):
        r = [35, 35, 31, 33][(b // 2) % 4]
        place(bs, bass808(r, spb * 2.2), b * 4 * spb); place(bs, bass808(r + 7, spb * 1.3, r), (b * 4 + 2.5) * spb)
    mel = [(0, 83), (.5, 86), (1, 90), (1.5, 88), (2, 86), (3, 83), (3.5, 81)]
    for b in range(2, bars):
        for (t0, nt) in mel: place(bl, marimba(nt - (4 if (b // 2) % 4 == 2 else 0), .6, .1), (b * 4 + t0) * spb); place(bl, cowbell(nt - 12, .1) * .15, (b * 4 + t0) * spb)
    for b in range(0, bars, 2): place(pad, supersaw([[59, 62, 66], [59, 62, 66], [55, 59, 62], [57, 61, 64]][(b // 2) % 4], spb * 8, 1100, .07), b * 4 * spb)
    beats = [b * 4 for b in range(bars)]
    sc = sidechain(L, beats, .5, bpm)
    return master(dr + bs * sc + bl + pad)

# ---------------- calm series: 10 lo-fi / chill variations ----------------
def soft_lead(note, dur, vol=.07, vib=4.5):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(note) * (1 + .004 * np.sin(2 * np.pi * vib * t))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + .15 * np.sin(4 * np.pi * np.cumsum(f) / SR) + hp(rng.standard_normal(n), 3000) * .02
    return x * env(n, .06, dur * .7) * vol

def guitar(note, dur=.6, vol=.11):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(note)
    x = sum(np.sin(2 * np.pi * f * h * t) * np.exp(-t * (3 + h * 2.5)) / h for h in range(1, 6))
    return lp(x, 3500) * vol

def rain(L):
    x = lp(hp(rng.standard_normal(L), 400), 6000) * .018
    drops = np.zeros(L); idx = rng.integers(0, L, 2500); drops[idx] = rng.standard_normal(2500) * .12
    return x + bp(drops, 1500, 7000)

def calm(bpm, bars, prog, melody, keys='ep', lead='mar', bassoct=-12, rainy=False, swing=.06, kickpat=(0, 1.75, 2.5), seed=1, drums=True):
    global rng
    rng = np.random.default_rng(seed)
    spb = 60 / bpm; L = int(round(bars * 4 * spb * SR))
    dr, bs, ky, ld = (np.zeros(L) for _ in range(4))
    for b in range(bars):
        o = b * 4
        if drums:
            for k in kickpat: place(dr, lp(kick(.3), 2500) * .75, (o + k) * spb)
            for k in (1, 3): place(dr, lp(clap(), 4500) * .45, (o + k + .03) * spb)
            for st in range(8): place(dr, lp(hat(), 9000) * (.38 if st % 2 else .25), (o + st / 2 + (swing if st % 2 else 0)) * spb)
    for b in range(bars):
        c = prog[b % len(prog)]
        if keys == 'ep': place(ky, epiano(c, spb * 3.9, .13), b * 4 * spb)
        elif keys == 'pad': place(ky, supersaw(c, spb * 4, 1300, .07), b * 4 * spb)
        elif keys == 'gtr':
            for i, k in enumerate((0, .5, 1, 1.5, 2, 2.5, 3, 3.5)): place(ky, guitar(c[i % len(c)] + (12 if i % 4 == 3 else 0), .7, .09), (b * 4 + k) * spb)
        place(bs, lp(bass808(c[0] + bassoct, spb * 1.8), 380) * .85, b * 4 * spb)
        place(bs, lp(bass808(c[0] + bassoct + (7 if b % 2 else 0), spb * 1.2), 380) * .7, (b * 4 + 2.5) * spb)
    for b in range(2, bars):
        ph = melody[(b // 2) % len(melody)] if b % 2 == 0 else melody[(b // 2) % len(melody)][:3]
        for (t0, nt, d) in ph:
            if lead == 'mar': place(ld, marimba(nt, .6, .11), (b * 4 + t0) * spb)
            elif lead == 'flute': place(ld, soft_lead(nt, d * spb), (b * 4 + t0) * spb)
            elif lead == 'gtr': place(ld, guitar(nt + 12, .8, .1), (b * 4 + t0) * spb)
            elif lead == 'bell': place(ld, marimba(nt + 12, .9, .07) + 0, (b * 4 + t0) * spb)
    crackle = np.zeros(L); idx = rng.integers(0, L, 700); crackle[idx] = rng.standard_normal(700) * .2
    mix = dr + bs + ky + ld + hp(crackle, 2000) + (rain(L) if rainy else 0)
    return master(lp(mix, 11000), -17)

M = lambda *xs: [(a, b, c) for (a, b, c) in xs]
def calm1(): return calm(80, 12, [[50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59], [45, 48, 52, 55]], [M((0, 74, 1), (1, 72, 1), (2, 69, 2)), M((0, 72, 1), (1.5, 74, 1), (2.5, 76, 1.5))], 'ep', 'flute', seed=11)                    # Dm9 G13 Cmaj7 Am7
def calm2(): return calm(74, 12, [[52, 55, 59, 62], [48, 52, 55, 59], [53, 57, 60, 64], [55, 59, 62, 65]], [M((0, 76, 1), (.5, 79, 1), (1.5, 74, 1), (3, 71, 1))], 'gtr', 'mar', rainy=True, seed=12)                                     # rainy guitar
def calm3(): return calm(88, 12, [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [55, 58, 62, 65]], [M((0, 77, 1), (1, 76, 1), (2, 72, 1), (3, 74, 1))], 'ep', 'bell', seed=13)
def calm4(): return calm(70, 10, [[45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 53], [40, 44, 47, 50]], [M((0, 69, 2), (2, 72, 1), (3, 71, 1)), M((0, 76, 2), (2, 74, 2))], 'pad', 'flute', seed=14, kickpat=(0, 2.5))        # dreamy pad
def calm5(): return calm(84, 12, [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 53]], [M((0, 72, 1), (.75, 76, 1), (1.5, 79, 1), (2.5, 76, 1), (3.25, 74, 1))], 'ep', 'mar', seed=15)                         # sunny C
def calm6(): return calm(76, 12, [[51, 55, 58, 62], [48, 51, 55, 58], [44, 48, 51, 55], [46, 50, 53, 56]], [M((0, 75, 1.5), (2, 79, 1), (3, 77, 1))], 'gtr', 'flute', rainy=True, seed=16)                                              # Eb rainy
def calm7(): return calm(90, 12, [[57, 61, 64, 68], [54, 57, 61, 64], [50, 54, 57, 61], [52, 56, 59, 62]], [M((0, 81, 1), (1, 80, 1), (1.5, 76, 1), (2.5, 73, 1), (3.5, 76, .5))], 'ep', 'gtr', seed=17)                             # A major warm
def calm8(): return calm(72, 10, [[50, 53, 57, 60], [46, 50, 53, 57], [43, 46, 50, 53], [45, 49, 52, 55]], [M((0, 74, 2), (2.5, 77, 1.5)), M((0, 72, 1), (1, 70, 1), (2, 69, 2))], 'pad', 'bell', seed=18, drums=True, kickpat=(0, 2.75))  # night
def calm9(): return calm(82, 12, [[55, 59, 62, 66], [52, 55, 59, 62], [48, 52, 55, 59], [50, 54, 57, 60]], [M((0, 79, 1), (1, 78, 1), (2, 74, 1), (3, 71, 1))], 'gtr', 'mar', seed=19)                                                  # G major morning
def calm10(): return calm(78, 12, [[49, 52, 56, 59], [45, 49, 52, 56], [47, 51, 54, 57], [44, 47, 51, 54]], [M((0, 73, 1), (1, 76, 1), (2, 80, 1.5), (3.5, 78, .5)), M((0, 75, 2), (2, 73, 2))], 'ep', 'flute', rainy=True, seed=20)   # C# minor rain

# ---------------- light series: in the spirit of the original quiz-reel sound (plucky arpeggio + soft kick) ----------------
def kalimba(note, dur=.5, vol=.2):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(note)
    x = np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 30)
    return x * np.exp(-t * 7) * vol

def bellp(note, dur=.6, vol=.16):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(note)
    x = np.sin(2 * np.pi * f * t + 1.2 * np.sin(2 * np.pi * f * 3.5 * t) * np.exp(-t * 6))
    return x * np.exp(-t * 6) * vol

def plk(note, dur=.25, vol=.2):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(note)
    return (np.sin(2 * np.pi * f * t) + .33 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 12) * vol

def softkick():
    n = int(.3 * SR); t = np.arange(n) / SR; ph = 2 * np.pi * np.cumsum(50 + 80 * np.exp(-t * 30)) / SR
    return np.sin(ph) * np.exp(-t * 10) * .7

def light(bpm, prog, pattern, voice='plk', kick_every=4, hats=False, bass=False, clapb=False, seed=1, oct_=0):
    global rng
    rng = np.random.default_rng(seed)
    e8 = 60 / bpm / 2; steps = 8 * 2 * len(prog)   # 2 bars per chord, 8 eighths per bar
    L = int(round(steps * e8 * SR)); mu, dr, bs = np.zeros(L), np.zeros(L), np.zeros(L)
    V = {'plk': plk, 'kal': kalimba, 'bell': bellp, 'mar': lambda n: marimba(n, .4, .2)}[voice]
    for i in range(steps):
        c = prog[(i // 16) % len(prog)]; nt = c[pattern[i % len(pattern)] % len(c)] + 12 * (pattern[i % len(pattern)] // len(c)) + oct_
        place(mu, V(nt), i * e8)
        if i % kick_every == 0: place(dr, softkick(), i * e8)
        if hats and i % 2 == 1: place(dr, hat() * .35, i * e8)
        if clapb and i % 8 == 4: place(dr, lp(clap(), 6000) * .4, i * e8)
        if bass and i % 8 == 0: place(bs, lp(bass808(c[0] - 24, e8 * 7), 300) * .55, i * e8)
    return master(mu + dr + bs, -19)

C = [[72, 76, 79], [69, 72, 76], [65, 69, 72], [67, 71, 74]]          # C Am F G
P1 = [0, 1, 2, 1, 0, 1, 2, 3]; P2 = [0, 2, 1, 3, 2, 4, 3, 1]; P3 = [0, 1, 2, 3, 4, 3, 2, 1]; P4 = [2, 1, 0, 1, 2, 3, 2, 1]
def light1(): return light(110, [[72, 76, 79], [74, 77, 81]], [0, 1, 2, 1], 'plk', 4, seed=31)                                # closest to the original
def light2(): return light(112, C, P1, 'plk', 4, hats=True, seed=32)
def light3(): return light(106, C, P3, 'kal', 4, seed=33)
def light4(): return light(116, [[74, 77, 81], [70, 74, 77], [72, 76, 79], [69, 73, 76]], P2, 'mar', 4, hats=True, bass=True, seed=34)   # Dm Bb C A
def light5(): return light(104, [[67, 71, 74], [64, 67, 71], [60, 64, 67], [62, 66, 69]], P1, 'bell', 4, seed=35, oct_=12)             # G Em C D bells
def light6(): return light(120, C, P4, 'plk', 2, hats=True, clapb=True, seed=36)
def light7(): return light(100, [[69, 72, 76], [65, 69, 72], [72, 76, 79], [67, 71, 74]], P3, 'kal', 4, bass=True, seed=37)           # Am F C G kalimba
def light8(): return light(114, [[71, 74, 78], [67, 71, 74], [74, 78, 81], [69, 73, 76]], P2, 'plk', 4, hats=True, seed=38)            # Bm G D A
def light9(): return light(108, [[65, 69, 72], [67, 71, 74], [64, 67, 71], [69, 72, 76]], P1, 'mar', 4, clapb=True, seed=39)          # F G Em Am marimba
def light10(): return light(118, [[76, 79, 83], [72, 76, 79], [74, 77, 81], [71, 74, 78]], P4, 'bell', 2, hats=True, bass=True, seed=40)

if __name__ == '__main__':
    import soundfile as sf
    for name, fn in ((a, globals()[a]) for a in (sys.argv[1:] or ['phonk', 'future', 'afro', 'tension', 'arcade', 'reggaeton', 'drill', 'lofi', 'jersey', 'trap'])):
        x = fn(); sf.write(f'/home/claude/music/{name}.wav', x.astype(np.float32), SR); print(name, len(x) / SR)
