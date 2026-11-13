import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Project } from "../../shared/types";
import { computeTimeline, secondsToFrames } from "../../remotion/utils/timing";
import { TMP_DIR } from "./paths";

const run = promisify(execFile);

/**
 * Offline text-to-speech for voice-overs (no cloud service, nothing leaves the machine).
 * Bahasa Melayu uses espeak-ng + the MBROLA "ma1" Malay voice when installed,
 * otherwise the built-in espeak-ng Malay voice. English uses espeak-ng "en-gb".
 * Output is synthetic; for broadcast quality, upload a recorded voice-over.
 */

/** Spoken forms for brand terms the Malay voice would otherwise mispronounce. */
const MS_PRONUNCIATION: [RegExp, string][] = [
  [/\bPRC\b/g, "pi ar si"],
  [/\btiny house\b/gi, "taini haus"],
  [/\bSemi-D\b/gi, "semi di"],
  [/\bhomestay\b/gi, "hom stei"],
  [/\bTikTok\b/gi, "tik tok"],
  [/\bSdn Bhd\b/gi, "sendirian berhad"],
  [/@/g, " at "],
  [/&/g, " dan "],
];

export function spokenForm(text: string, lang: "ms" | "en") {
  let t = text.replace(/\|/g, " ").replace(/\s+/g, " ").trim();
  if (lang === "ms") for (const [re, s] of MS_PRONUNCIATION) t = t.replace(re, s);
  return t;
}

let voiceCache: string | undefined;
async function pickVoice(lang: "ms" | "en") {
  if (lang === "en") return "en-gb";
  if (voiceCache) return voiceCache;
  const hasMbrola = fs.existsSync("/usr/share/mbrola/ma1") || fs.existsSync("/usr/share/mbrola/ma1/ma1");
  voiceCache = hasMbrola ? "mb-ma1" : "ms";
  return voiceCache;
}

export async function ttsAvailable() {
  try {
    await run("espeak-ng", ["--version"], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/** Synthesize one line to a mono 48 kHz WAV, softened with EQ + light room. Returns duration. */
export async function synthLine(text: string, lang: "ms" | "en", out: string, opts: { rate?: number; pitch?: number } = {}) {
  const voice = await pickVoice(lang);
  const raw = out.replace(/\.wav$/, ".raw.wav");
  await run("espeak-ng", ["-v", voice, "-s", String(opts.rate ?? 160), "-p", String(opts.pitch ?? 42), "-g", "4", "-w", raw, spokenForm(text, lang)], { timeout: 60_000 });
  // warm EQ, de-harsh, gentle compression and a small room so the diphone voice sits in the mix
  await run("ffmpeg", [
    "-y", "-v", "error", "-i", raw,
    "-af", "highpass=f=90,lowpass=f=7800,equalizer=f=220:t=q:w=1:g=2.5,equalizer=f=3200:t=q:w=1.2:g=-2,acompressor=threshold=-20dB:ratio=3:attack=8:release=120,aecho=0.8:0.5:28:0.12,aresample=48000",
    "-ac", "1", out,
  ], { timeout: 60_000 });
  fs.rmSync(raw, { force: true });
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]);
  return Number(stdout.trim());
}

/** Measure how long each scene's voice-over line takes, so scenes can be timed to fit. */
export async function measureLines(lines: string[], lang: "ms" | "en") {
  const dir = fs.mkdtempSync(path.join(TMP_DIR, "tts-"));
  try {
    const out: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      out.push(lines[i].trim() ? await synthLine(lines[i], lang, path.join(dir, `m${i}.wav`)) : 0);
    }
    return out;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Build one voice-over track for the whole video: each scene's line starts
 * `lead` seconds after that scene begins on the final (transition-aware) timeline.
 * Returns the m4a path and per-scene start/end so timing can be reported.
 */
export async function buildProjectVoiceOver(project: Project, outM4a: string, lead = 0.35) {
  const fps = project.fps;
  const { entries, totalFrames } = computeTimeline(
    project.scenes.map((s) => ({ sceneId: s.id, durationInFrames: secondsToFrames(s.duration, fps), transition: s.transition })),
    fps,
  );
  const dir = fs.mkdtempSync(path.join(TMP_DIR, "vo-"));
  try {
    const inputs: string[] = [];
    const filters: string[] = [];
    const placed: { sceneId: string; start: number; end: number; overrun: number }[] = [];
    for (let i = 0; i < project.scenes.length; i++) {
      const s = project.scenes[i];
      if (!s.voiceOver.trim()) continue;
      const wav = path.join(dir, `l${i}.wav`);
      const dur = await synthLine(s.voiceOver, project.language, wav);
      const start = entries[i].startFrame / fps + lead;
      const sceneEnd = (entries[i].startFrame + entries[i].durationInFrames) / fps;
      placed.push({ sceneId: s.id, start, end: start + dur, overrun: Math.max(0, start + dur - sceneEnd) });
      const idx = inputs.length / 2;
      inputs.push("-i", wav);
      filters.push(`[${idx}:a]adelay=${Math.round(start * 1000)}:all=1[a${idx}]`);
    }
    if (!placed.length) throw new Error("No voice-over lines in this project");
    const n = placed.length;
    const total = totalFrames / fps;
    const graph = `${filters.join(";")};${Array.from({ length: n }, (_, k) => `[a${k}]`).join("")}amix=inputs=${n}:normalize=0,apad,atrim=0:${total.toFixed(3)},loudnorm=I=-16:TP=-1.5:LRA=9[out]`;
    await run("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex", graph, "-map", "[out]", "-ar", "48000", "-ac", "2", "-c:a", "aac", "-b:a", "192k", outM4a], { timeout: 180_000 });
    return { placed, total };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
