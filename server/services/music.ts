import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const SR = 44100;

/**
 * Procedurally synthesised, original music beds and sound effects.
 * Nothing is sampled from existing recordings, so the output is free of
 * third-party copyright. Deterministic: same inputs → same file.
 */

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function writeWav(path: string, L: Float32Array, R: Float32Array) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 4, 40);
  let peak = 1e-9;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = 0.89 / peak;
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(path, buf);
}

/** Simple stereo reverb: parallel combs + allpass (Schroeder). */
function reverb(L: Float32Array, R: Float32Array, mix = 0.28) {
  const proc = (x: Float32Array, offs: number) => {
    const combs = [1557, 1617, 1491, 1422].map((d) => ({ d: d + offs, buf: new Float32Array(d + offs), i: 0, fb: 0.82 }));
    const aps = [225, 556].map((d) => ({ d, buf: new Float32Array(d), i: 0 }));
    const y = new Float32Array(x.length);
    for (let n = 0; n < x.length; n++) {
      let s = 0;
      for (const c of combs) {
        const o = c.buf[c.i];
        c.buf[c.i] = x[n] * 0.25 + o * c.fb;
        c.i = (c.i + 1) % c.d;
        s += o;
      }
      for (const a of aps) {
        const o = a.buf[a.i];
        const v = s + o * 0.5;
        a.buf[a.i] = v;
        a.i = (a.i + 1) % a.d;
        s = o - v * 0.5;
      }
      y[n] = x[n] * (1 - mix) + s * mix;
    }
    return y;
  };
  return [proc(L, 0), proc(R, 23)] as const;
}

export function synthAmbientBed(seconds: number, opts: { bpm?: number } = {}) {
  const bpm = opts.bpm ?? 84;
  const beat = 60 / bpm;
  const N = Math.ceil((seconds + 0.5) * SR);
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  const rnd = mulberry32(7);
  // F maj9 – C/E – A m7 – G sus → warm, hopeful, "home" feel
  const chords = [
    [41, 53, 57, 60, 64, 67],
    [40, 52, 55, 60, 64, 67],
    [45, 52, 57, 60, 64, 67],
    [43, 50, 55, 62, 65, 67],
  ];
  const chordLen = beat * 8;
  const total = seconds;

  // Pads (detuned, softly filtered)
  for (let c = 0; c * chordLen < total + chordLen; c++) {
    const notes = chords[c % chords.length];
    const t0 = c * chordLen;
    const isLast = (c + 1) * chordLen >= total;
    const len = isLast ? total - t0 + 0.5 : chordLen + 1.2;
    const s0 = Math.floor(t0 * SR);
    const sN = Math.min(N, Math.floor((t0 + len) * SR));
    notes.slice(1).forEach((note, vi) => {
      const f = midi(note);
      const det = [0.997, 1.0, 1.0035];
      const pan = (vi / 4) * 2 - 1;
      let lp = 0;
      for (let s = s0; s < sN; s++) {
        const t = (s - s0) / SR;
        const env = Math.min(1, t / 1.1) * Math.min(1, (len - t) / 1.2);
        let v = 0;
        for (const d of det) {
          const ph = 2 * Math.PI * f * d * t;
          v += Math.sin(ph) + 0.28 * Math.sin(2 * ph) + 0.1 * Math.sin(3 * ph);
        }
        lp += (v - lp) * 0.08;
        const a = lp * env * 0.022;
        L[s] += a * (1 - pan * 0.4);
        R[s] += a * (1 + pan * 0.4);
      }
    });
    // sub bass
    const fb = midi(notes[0]);
    for (let s = s0; s < sN; s++) {
      const t = (s - s0) / SR;
      const env = Math.min(1, t / 0.6) * Math.min(1, (len - t) / 0.8);
      const v = Math.sin(2 * Math.PI * fb * t) * env * 0.11;
      L[s] += v;
      R[s] += v;
    }
  }

  // Arpeggio plucks from bar 2, 8th notes
  const arpStart = beat * 4;
  for (let k = 0; ; k++) {
    const t0 = arpStart + k * (beat / 2);
    if (t0 > total - 1.5) break;
    const c = Math.floor(t0 / chordLen) % chords.length;
    const tones = chords[c].slice(2);
    const pattern = [0, 2, 1, 3, 4, 2, 3, 1];
    const note = tones[pattern[k % pattern.length] % tones.length] + 12;
    const f = midi(note);
    const vel = 0.5 + 0.5 * (k % 4 === 0 ? 1 : rnd() * 0.6);
    const s0 = Math.floor(t0 * SR);
    const pan = Math.sin(k * 0.7) * 0.5;
    const ramp = Math.min(1, (t0 - arpStart) / (beat * 8));
    for (let s = s0; s < Math.min(N, s0 + SR * 1.4); s++) {
      const t = (s - s0) / SR;
      const env = Math.exp(-t * 4.2) * Math.min(1, t / 0.004);
      const v = (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t * 9)) * env * 0.05 * vel * ramp;
      L[s] += v * (1 - pan);
      R[s] += v * (1 + pan);
    }
  }

  // Soft heartbeat pulse from bar 3 until the final bar
  for (let b = 8; b * beat < total - beat * 3; b++) {
    const s0 = Math.floor(b * beat * SR);
    const strength = b % 2 === 0 ? 1 : 0.55;
    for (let s = s0; s < Math.min(N, s0 + SR * 0.35); s++) {
      const t = (s - s0) / SR;
      const f = 48 + 60 * Math.exp(-t * 28);
      const v = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 11) * 0.16 * strength;
      L[s] += v;
      R[s] += v;
    }
  }

  // Final swell + shimmer for the logo/CTA
  const shimmerAt = Math.max(0, total - 9.6);
  for (const note of [76, 79, 84]) {
    const f = midi(note);
    const s0 = Math.floor(shimmerAt * SR);
    for (let s = s0; s < N; s++) {
      const t = (s - s0) / SR;
      const env = Math.min(1, t / 0.05) * Math.exp(-t * 0.6);
      const v = Math.sin(2 * Math.PI * f * t + Math.sin(t * 5) * 0.3) * env * 0.018;
      L[s] += v;
      R[s] += v * 0.9;
    }
  }

  const [rl, rr] = reverb(L, R);
  // master fade
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const g = Math.min(1, t / 1.5) * Math.min(1, Math.max(0, (total + 0.4 - t) / 2.2));
    rl[i] *= g;
    rr[i] *= g;
  }
  return { L: rl, R: rr };
}

export function synthWhoosh(seconds = 1.1) {
  const N = Math.floor(seconds * SR);
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  const rnd = mulberry32(99);
  let lp1 = 0;
  let lp2 = 0;
  for (let i = 0; i < N; i++) {
    const t = i / seconds / SR;
    const env = Math.sin(Math.PI * Math.pow(t, 0.7)) ** 2;
    const cutoff = 0.02 + 0.25 * Math.sin(Math.PI * t);
    const n = rnd() * 2 - 1;
    lp1 += (n - lp1) * cutoff;
    lp2 += (lp1 - lp2) * cutoff;
    const pan = t * 2 - 1;
    L[i] = lp2 * env * (1 - pan * 0.6);
    R[i] = lp2 * env * (1 + pan * 0.6);
  }
  return { L, R };
}

/** Render a synthesised buffer to AAC (.m4a) with loudness normalisation. */
export async function renderToM4a(buf: { L: Float32Array; R: Float32Array }, outPath: string, lufs = -16) {
  const wav = outPath.replace(/\.m4a$/, ".tmp.wav");
  writeWav(wav, buf.L, buf.R);
  try {
    await run("ffmpeg", ["-y", "-v", "error", "-i", wav, "-af", `loudnorm=I=${lufs}:TP=-1.5:LRA=11`, "-ar", "48000", "-c:a", "aac", "-b:a", "192k", outPath], { timeout: 120_000 });
  } finally {
    fs.rmSync(wav, { force: true });
  }
}
