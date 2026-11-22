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

if __name__ == '__main__':
    import soundfile as sf
    for name, fn in (('phonk', phonk), ('future', future)):
        x = fn(); sf.write(f'/home/claude/music/{name}.wav', x.astype(np.float32), SR); print(name, len(x) / SR)
