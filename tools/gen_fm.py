import math, struct, subprocess, os

SR = 44100
BPM = 92
BEAT = 60.0 / BPM
BARS = 16
STEPS = BARS * 4
DUR = STEPS * BEAT
N = int(SR * DUR)

def note(n):
    return 440.0 * (2 ** ((n - 69) / 12.0))

# dusk vice: A minor / F / C / G
chords = [
    [note(57), note(60), note(64)],  # A3 C4 E4
    [note(53), note(57), note(60)],  # F3 A3 C4
    [note(48), note(52), note(55)],  # C3 E3 G3
    [note(55), note(59), note(62)],  # G3 B3 D4
]
bass = [note(33), note(29), note(24), note(31)]  # A1 F1 C1 G1
lead = [note(72), note(76), note(79), note(76), note(74), note(72), note(69), note(67)]

left = [0.0] * N
right = [0.0] * N

def add(i, v, pan=0.0):
    if 0 <= i < N:
        left[i] += v * (1 - max(0, pan))
        right[i] += v * (1 - max(0, -pan))

def env(t, a, d, s, r, hold):
    if t < a: return t / a if a else 1
    t -= a
    if t < d: return 1 - (1 - s) * (t / d if d else 1)
    t -= d
    if t < hold: return s
    t -= hold
    if t < r: return s * (1 - t / r)
    return 0.0

for i in range(N):
    t = i / SR
    step = int(t / BEAT) % STEPS
    bar = (step // 4) % 4
    local = t % BEAT
    # pad
    for f in chords[bar]:
        v = 0.045 * math.sin(2 * math.pi * f * t) * (0.7 + 0.3 * math.sin(2 * math.pi * 0.12 * t))
        add(i, v, -0.2)
        add(i, 0.03 * math.sin(2 * math.pi * (f * 0.5) * t), 0.25)
    # bass
    bf = bass[bar]
    bp = env(local + (step % 4) * BEAT, 0.01, 0.08, 0.55, 0.2, BEAT * 3.4)
    add(i, 0.22 * math.sin(2 * math.pi * bf * t) * bp, 0.0)
    # kick on 1 and 3
    if step % 2 == 0:
        kt = local
        if kt < 0.18:
            kf = 70 * (1 - kt / 0.18) + 38
            add(i, 0.38 * math.sin(2 * math.pi * kf * kt) * (1 - kt / 0.18))
    # hat on offbeats
    if step % 2 == 1:
        ht = local
        if ht < 0.05:
            add(i, 0.07 * (1 - ht / 0.05) * ((i * 13 + 7) % 7 / 7 - 0.5), 0.4)
    # lead arp
    lf = lead[step % len(lead)]
    if local < 0.28:
        le = env(local, 0.01, 0.05, 0.35, 0.18, 0.04)
        add(i, 0.09 * math.sin(2 * math.pi * lf * t) * le, 0.15)
        add(i, 0.04 * math.sin(2 * math.pi * (lf * 2) * t) * le, -0.15)

# soft clip
out = bytearray()
for i in range(N):
    l = max(-1.0, min(1.0, left[i] * 0.95))
    r = max(-1.0, min(1.0, right[i] * 0.95))
    out += struct.pack("<hh", int(l * 30000), int(r * 30000))

wav = "/tmp/nova-fm.wav"
mp3 = "/workspace/viceblock/public/audio/nova-fm.mp3"
with open(wav, "wb") as f:
    datasz = len(out)
    f.write(struct.pack("<4sI4s4sIHHIIHH4sI", b"RIFF", 36 + datasz, b"WAVE", b"fmt ", 16, 1, 2, SR, SR * 4, 4, 16, b"data", datasz))
    f.write(out)
subprocess.check_call(["ffmpeg", "-y", "-i", wav, "-codec:a", "libmp3lame", "-b:a", "128k", mp3])
print("wrote", mp3, "bytes", os.path.getsize(mp3))
