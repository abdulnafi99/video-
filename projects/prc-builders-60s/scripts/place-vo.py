"""Cut a single TTS take (one sentence per paragraph) into lines and place them on the film's cues.

    python3 -I projects/prc-builders-60s/scripts/place-vo.py <take.mp3>

Writes assets/audio/vo.wav (60 s, mono 48 kHz) and assets/audio/cues.json, then run
    npx tsx projects/prc-builders-60s/scripts/build-audio.ts --mix-only
"""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "audio")
TMP = os.path.join(OUT, ".tmp")
os.makedirs(TMP, exist_ok=True)
SRC = sys.argv[1]

# (id, src_start, src_end, earliest film time, tempo)
# Source spans come from silencedetect (-45 dB, 0.18 s) on the ttsmaker take.
LINES = [
    ("s1",  2.40,  6.22,  0.9, 1.00),
    ("s2",  7.21, 15.75,  6.3, 1.00),
    ("s3a", 16.74, 26.26, 15.3, 1.00),
    ("s3b", 27.24, 29.46, 26.4, 1.00),
    ("s4",  30.46, 33.47, 29.2, 1.00),
    ("p1",  34.48, 35.41, 32.4, 1.00),
    ("p2",  36.40, 37.36, 33.65, 1.00),
    ("p3",  38.35, 39.43, 34.9, 1.00),
    ("p4",  40.44, 41.26, 36.15, 1.00),
    ("p5",  42.26, 43.08, 37.4, 1.00),
    ("p6",  44.07, 45.43, 38.55, 1.00),
    ("k1",  46.41, 48.69, 40.2, 1.15),
    ("k2",  49.67, 51.54, 0.0, 1.15),
    ("k3",  52.52, 54.71, 0.0, 1.15),
    ("k4",  54.99, 56.85, 0.0, 1.15),
    ("t1",  57.84, 62.29, 48.1, 1.10),   # "Merancang dengan tujuan. Membina dengan ketepatan."
    ("s6",  63.28, 69.41, 51.75, 1.00),  # "PRC Builders Sendirian Berhad. Mari bina visi anda, bersama kami."
]
GAP = 0.10

def run(*a):
    return subprocess.run(a, check=True, capture_output=True, text=True).stdout

def dur(f):
    return float(run("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f))

placed, inputs, filters, cursor = [], [], [], 0.0
for i, (lid, a, b, at, tempo) in enumerate(LINES):
    seg = os.path.join(TMP, f"{lid}.wav")
    af = (f"atrim={max(0, a - 0.04):.3f}:{b + 0.08:.3f},asetpts=PTS-STARTPTS,aresample=48000,"
          + (f"atempo={tempo}," if tempo != 1 else "")
          + "highpass=f=75,equalizer=f=160:t=q:w=1:g=1.5,equalizer=f=3500:t=q:w=1.5:g=1.5,"
            "acompressor=threshold=-20dB:ratio=2.5:attack=8:release=150:makeup=1.5,"
            "afade=t=in:d=0.02,areverse,afade=t=in:d=0.06,areverse")
    run("ffmpeg", "-y", "-v", "error", "-i", SRC, "-af", af, "-ac", "1", seg)
    d = dur(seg)
    start = max(at, cursor + GAP)
    cursor = start + d
    placed.append({"id": lid, "start": round(start, 2), "end": round(cursor, 2)})
    inputs += ["-i", seg]
    filters.append(f"[{i}:a]adelay={round(start * 1000)}:all=1[v{i}]")

graph = ";".join(filters) + ";" + "".join(f"[v{i}]" for i in range(len(LINES))) + \
    f"amix=inputs={len(LINES)}:normalize=0,apad,atrim=0:60[o]"
run("ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", graph, "-map", "[o]", "-ar", "48000", "-ac", "1",
    os.path.join(OUT, "vo.wav"))
json.dump(placed, open(os.path.join(OUT, "cues.json"), "w"), indent=2)
for p in placed:
    print(f'{p["id"]:4} {p["start"]:6.2f} -> {p["end"]:6.2f}')
subprocess.run(["rm", "-rf", TMP])
