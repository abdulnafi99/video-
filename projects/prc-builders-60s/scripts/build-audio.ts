/**
 * Builds the soundtrack for the PRC Builders 60s film.
 *
 *   npx tsx projects/prc-builders-60s/scripts/build-audio.ts
 *
 * Outputs (assets/audio/):
 *   music.wav  original, procedurally synthesised score + hits/whooshes (no third-party audio)
 *   vo.wav     Bahasa Melayu voice-over guide track (offline espeak-ng + MBROLA ma1)
 *   mix.wav    music ducked under the voice-over, loudness-normalised (-14 LUFS), used by index.html
 *   cues.json  where each voice-over line actually lands (for checking sync with the visuals)
 *
 * Replace vo.wav with a studio recording of voiceover-script.md (same cue times) and re-run
 * with --mix-only to rebuild mix.wav around it.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { synthAmbientBed, synthWhoosh } from "../../../server/services/music";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "assets/audio");
const TMP = path.join(OUT, ".tmp");
const SR = 44100;
const TOTAL = 60;
fs.mkdirSync(TMP, { recursive: true });

const sh = (cmd: string, args: string[]) => execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"] }).toString();
const dur = (f: string) => Number(sh("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).trim());

/* --------------------------------------------------------------- voice-over */
// `at` = earliest start (s). Lines are laid out in order, never overlapping.
// Spoken forms: "PRC" → "pi ar si", "Builders" → "bilders", "Sdn. Bhd." → "Sendirian Berhad".
const VO: { id: string; at: number; text: string; rate?: number }[] = [
  { id: "s1", at: 0.9, text: "Pi ar si Bilders. Membina kediaman, mencipta nilai yang berkekalan.", rate: 158 },
  { id: "s2", at: 6.5, text: "Kami rakan pembinaan kediaman anda, menggabungkan perancangan, reka bentuk dan pembinaan, dalam satu proses yang tersusun.", rate: 162 },
  { id: "s3a", at: 15.4, text: "Daripada reka bentuk dan bina, pembinaan rumah baharu, pengubahsuaian dan tambahan, kerja dalaman, hinggalah perundingan dan pengurusan projek.", rate: 160 },
  { id: "s3b", at: 26.4, text: "Penyelesaian kediaman yang lengkap.", rate: 150 },
  { id: "s4", at: 29.3, text: "Setiap projek melalui enam langkah yang jelas.", rate: 168 },
  { id: "p1", at: 32.4, text: "Memahami.", rate: 150 },
  { id: "p2", at: 33.65, text: "Merancang.", rate: 150 },
  { id: "p3", at: 34.9, text: "Mereka bentuk.", rate: 150 },
  { id: "p4", at: 36.15, text: "Membina.", rate: 150 },
  { id: "p5", at: 37.4, text: "Menyemak.", rate: 150 },
  { id: "p6", at: 38.65, text: "Dan menyerahkan.", rate: 150 },
  { id: "k1", at: 40.3, text: "Pengurusan projek yang profesional.", rate: 175 },
  { id: "k2", at: 42.1, text: "Tumpuan pada kualiti kerja.", rate: 175 },
  { id: "k3", at: 43.8, text: "Pendekatan berpaksikan pelanggan.", rate: 175 },
  { id: "k4", at: 45.6, text: "Komitmen terhadap penyiapan.", rate: 175 },
  { id: "t1", at: 47.5, text: "Merancang dengan tujuan. Membina dengan ketepatan.", rate: 165 },
  { id: "s6", at: 51.7, text: "Pi ar si Bilders Sendirian Berhad. Mari bina visi anda, bersama kami.", rate: 155 },
];

function buildVO() {
  const placed: { id: string; start: number; end: number; text: string }[] = [];
  let cursor = 0;
  const inputs: string[] = [];
  const filters: string[] = [];
  VO.forEach((l, i) => {
    const raw = path.join(TMP, `${l.id}.raw.wav`);
    const wav = path.join(TMP, `${l.id}.wav`);
    sh("espeak-ng", ["-v", "mb-ma1", "-s", String(l.rate ?? 155), "-p", "38", "-g", "2", "-w", raw, l.text]);
    // trim edges, warm broadcast EQ, de-ess, compression, short room
    sh("ffmpeg", ["-y", "-v", "error", "-i", raw, "-af",
      "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse," +
      "aresample=48000,highpass=f=80,lowpass=f=9000,equalizer=f=180:t=q:w=0.9:g=3,equalizer=f=2800:t=q:w=1.4:g=-2.5," +
      "equalizer=f=6500:t=q:w=2:g=-3,acompressor=threshold=-22dB:ratio=3.5:attack=6:release=140:makeup=2," +
      "aecho=0.85:0.6:24|41:0.10|0.06",
      "-ac", "1", wav]);
    const d = dur(wav);
    const start = Math.max(l.at, cursor + 0.12);
    cursor = start + d;
    placed.push({ id: l.id, start: +start.toFixed(2), end: +cursor.toFixed(2), text: l.text });
    inputs.push("-i", wav);
    filters.push(`[${i}:a]adelay=${Math.round(start * 1000)}:all=1[v${i}]`);
  });
  const graph = `${filters.join(";")};${VO.map((_, i) => `[v${i}]`).join("")}amix=inputs=${VO.length}:normalize=0,apad,atrim=0:${TOTAL}[o]`;
  sh("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex", graph, "-map", "[o]", "-ar", "48000", "-ac", "1", path.join(OUT, "vo.wav")]);
  fs.writeFileSync(path.join(OUT, "cues.json"), JSON.stringify(placed, null, 2));
  for (const p of placed) {
    const late = p.end > nextBoundary(p.start) ? `  <-- runs past ${nextBoundary(p.start)}s` : "";
    console.log(`${p.id.padEnd(4)} ${p.start.toFixed(2).padStart(6)} → ${p.end.toFixed(2).padStart(6)}${late}`);
  }
}
const BOUNDS = [6, 15, 29, 40, 51, 60];
const nextBoundary = (t: number) => BOUNDS.find((b) => b > t) ?? 60;

/* -------------------------------------------------------------------- music */
function writeWav(file: string, L: Float32Array, R: Float32Array) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  let peak = 1e-9;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = 0.89 / peak;
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(file, buf);
}

function buildMusic() {
  // 84 bpm bed; one bar = 2.857 s
  const bed = synthAmbientBed(TOTAL, { bpm: 84 });
  const N = Math.ceil(TOTAL * SR);
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  for (let i = 0; i < N && i < bed.L.length; i++) { L[i] = bed.L[i]; R[i] = bed.R[i]; }

  // cinematic low hit: sine drop + soft noise body
  const hit = (t: number, gain: number) => {
    const s0 = Math.floor(t * SR);
    let seed = s0 + 17;
    let lp = 0;
    for (let s = s0; s < Math.min(N, s0 + SR * 3.2); s++) {
      const x = (s - s0) / SR;
      const f = 38 + 70 * Math.exp(-x * 9);
      seed = (seed * 1664525 + 1013904223) >>> 0;
      lp += ((seed / 4294967296) * 2 - 1 - lp) * 0.05;
      const v = (Math.sin(2 * Math.PI * f * x) * Math.exp(-x * 1.6) + lp * 0.5 * Math.exp(-x * 5)) * gain;
      L[s] += v; R[s] += v;
    }
  };
  // reverse-swell riser into a boundary
  const riser = (end: number, len: number, gain: number) => {
    const s0 = Math.floor((end - len) * SR);
    let seed = s0 + 3;
    let lp = 0;
    for (let s = Math.max(0, s0); s < Math.min(N, Math.floor(end * SR)); s++) {
      const x = (s - s0) / SR / len;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      lp += ((seed / 4294967296) * 2 - 1 - lp) * (0.02 + 0.2 * x);
      const v = lp * Math.pow(x, 2.4) * gain;
      L[s] += v * (1 - x * 0.3); R[s] += v * (0.7 + x * 0.3);
    }
  };
  const whoosh = synthWhoosh(1.0);
  const placeWhoosh = (t: number, gain: number) => {
    const s0 = Math.floor((t - 0.5) * SR);
    for (let i = 0; i < whoosh.L.length; i++) {
      const s = s0 + i;
      if (s < 0 || s >= N) continue;
      L[s] += whoosh.L[i] * gain; R[s] += whoosh.R[i] * gain;
    }
  };

  // ---- motion sound design: short, quiet cues locked to each on-screen move ----
  const pan = (v: number, p: number, s: number) => { L[s] += v * (1 - p * 0.6); R[s] += v * (1 + p * 0.6); };
  // soft UI tick (text reveals, list rows)
  const tick = (t: number, gain = 0.09, p = 0) => {
    const s0 = Math.floor(t * SR);
    let seed = s0 + 91;
    for (let s = s0; s < Math.min(N, s0 + SR * 0.09); s++) {
      const x = (s - s0) / SR;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const n = (seed / 4294967296) * 2 - 1;
      pan((Math.sin(2 * Math.PI * 2200 * x) * 0.6 + n * 0.25) * Math.exp(-x * 70) * gain, p, s);
    }
  };
  // airy swish (photo cards sliding in)
  const sw = synthWhoosh(0.42);
  const swish = (t: number, gain = 0.16, p = 0) => {
    const s0 = Math.floor((t - 0.12) * SR);
    for (let i = 0; i < sw.L.length; i++) { const s = s0 + i; if (s >= 0 && s < N) pan((sw.L[i] + sw.R[i]) * 0.5 * gain, p, s); }
  };
  // glassy bell ping (process steps), rising pitch
  const ping = (t: number, f: number, gain = 0.12) => {
    const s0 = Math.floor(t * SR);
    for (let s = s0; s < Math.min(N, s0 + SR * 1.6); s++) {
      const x = (s - s0) / SR;
      const v = (Math.sin(2 * Math.PI * f * x) + 0.35 * Math.sin(2 * Math.PI * f * 2.01 * x) * Math.exp(-x * 3) + 0.15 * Math.sin(2 * Math.PI * f * 3.02 * x) * Math.exp(-x * 6)) * Math.exp(-x * 2.6) * Math.min(1, x / 0.003) * gain;
      L[s] += v; R[s] += v;
    }
  };
  // bright shimmer sweep (logo light sweeps)
  const shimmer = (t: number, len: number, gain = 0.05) => {
    const s0 = Math.floor(t * SR);
    [2093, 2637, 3136, 4186].forEach((f, k) => {
      const d = k * 0.12;
      for (let s = s0 + Math.floor(d * SR); s < Math.min(N, s0 + Math.floor((len + 1.2) * SR)); s++) {
        const x = (s - s0) / SR - d;
        const env = Math.min(1, x / 0.05) * Math.exp(-x * 1.8);
        const v = Math.sin(2 * Math.PI * f * x + Math.sin(x * 9) * 0.6) * env * gain;
        L[s] += v * (1 - k * 0.2); R[s] += v * (0.4 + k * 0.2);
      }
    });
  };
  const cardPan = (x: number, w: number) => ((x + w / 2) / 1920) * 2 - 1;
  const cards = (t0: number, xs: number[], w: number, step = 0.12) => xs.forEach((x, k) => swish(t0 + 0.1 + k * step, 0.15, cardPan(x, w)));

  // chronological cut — every cue sits on an on-screen move
  hit(0.35, 0.55); shimmer(0.3, 1.9, 0.05); placeWhoosh(1.3, 0.1); tick(1.3, 0.06);
  tick(3.0, 0.08); tick(3.4, 0.08); placeWhoosh(4.1, 0.08);
  [5.0, 10.5, 14.0, 18.0, 29.0, 32.0, 36.0, 44.0, 51.0].forEach((t) => placeWhoosh(t, 0.2));
  [5.0, 18.0, 36.0, 44.0].forEach((t) => hit(t, 0.32));
  riser(51.0, 2.2, 0.28); hit(51.0, 0.42);
  riser(8.6, 3.2, 0.08); tick(5.55, 0.07, -0.5);
  [6.8, 7.6, 8.4].forEach((t) => tick(t, 0.08, 0.6));
  [10.95, 14.45, 18.45, 29.45, 32.45].forEach((t) => tick(t, 0.08, -0.6));
  tick(10.9, 0.06, -0.6);
  [11.4, 11.75, 12.1, 12.45].forEach((t, i) => tick(t, 0.07, 0.2 + i * 0.15));
  placeWhoosh(15.7, 0.15);
  swish(20.6, 0.17, 0.5);
  placeWhoosh(23.6, 0.16); hit(23.0, 0.28);
  cards(23.3, [700, 1090, 1480], 360, 0.14); tick(23.75, 0.07, -0.6);
  cards(26.2, [1060, 1460], 360, 0.16);
  placeWhoosh(30.35, 0.14);
  cards(33.7, [720, 1090, 1460], 340, 0.12);
  placeWhoosh(37.4, 0.12); tick(36.45, 0.07);
  [38.3, 39.2, 40.1, 41.0, 41.9, 42.8].forEach((t, i) => ping(t, [880, 988, 1109, 1175, 1319, 1480][i], 0.11));
  [38.3, 39.2, 40.1, 41.0, 41.9, 42.8].forEach((t, i) => { const p = ((210 + i * 300) / 1920) * 2 - 1; swish(t + 0.08, 0.1, p); swish(t + 0.17, 0.08, p); });
  [44.3, 45.2, 46.1, 47.0].forEach((t) => tick(t, 0.09, -0.6));
  cards(44.0, [1040, 1440], 360, 0.14); cards(46.2, [1040, 1440], 360, 0.14);
  placeWhoosh(49.4, 0.12); cards(48.0, [100, 540, 980, 1420, 1860], 400, 0.08);
  hit(48.25, 0.18); hit(49.4, 0.2);
  shimmer(54.6, 1.5, 0.06); hit(54.7, 0.45);
  tick(55.65, 0.08); [56.4, 56.7, 57.05].forEach((t) => tick(t, 0.06));

  // gentle master fade at the very end
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const g = Math.min(1, Math.max(0, (TOTAL - t) / 1.6));
    L[i] *= g; R[i] *= g;
  }
  const tmp = path.join(TMP, "music.raw.wav");
  writeWav(tmp, L, R);
  sh("ffmpeg", ["-y", "-v", "error", "-i", tmp, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000", "-ac", "2", path.join(OUT, "music.wav")]);
}

/* ---------------------------------------------------------------------- mix */
function buildMix() {
  const music = path.join(OUT, "music.wav");
  const vo = path.join(OUT, "vo.wav");
  sh("ffmpeg", ["-y", "-v", "error", "-i", music, "-i", vo, "-filter_complex",
    "[1:a]aformat=channel_layouts=mono,volume=1.0,asplit=2[vo][sc];" +
    "[0:a]volume=0.62[m];[m][sc]sidechaincompress=threshold=0.04:ratio=6:attack=30:release=450:makeup=1[duck];" +
    "[vo]pan=stereo|c0=c0|c1=c0[vos];[duck][vos]amix=inputs=2:normalize=0,atrim=0:60," +
    "loudnorm=I=-14:TP=-1.0:LRA=9,aresample=48000[o]",
    "-map", "[o]", "-ac", "2", "-c:a", "pcm_s16le", path.join(OUT, "mix.wav")]);
}

/** Music and motion sound design only, no voice-over. */
function buildMusicOnlyMix() {
  sh("ffmpeg", ["-y", "-v", "error", "-i", path.join(OUT, "music.wav"), "-af",
    "atrim=0:60,loudnorm=I=-14:TP=-1.0:LRA=9,aresample=48000", "-ac", "2", "-c:a", "pcm_s16le", path.join(OUT, "mix.wav")]);
}

// --no-vo: music + motion sound effects only (current cut)
// --mix-only: keep music.wav and vo.wav; --keep-vo: rebuild music but keep vo.wav (e.g. a recorded take)
const noVo = process.argv.includes("--no-vo");
const mixOnly = process.argv.includes("--mix-only");
const keepVo = process.argv.includes("--keep-vo");
if (noVo) {
  buildMusic();
  buildMusicOnlyMix();
} else {
  if (!mixOnly) {
    if (!keepVo) buildVO();
    buildMusic();
  }
  buildMix();
}
fs.rmSync(TMP, { recursive: true, force: true });
console.log("audio →", OUT, ["music.wav", "vo.wav", "mix.wav"].map((f) => `${f} ${dur(path.join(OUT, f)).toFixed(2)}s`).join(", "));
