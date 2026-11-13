import type { Scene, SceneManifest, SceneManifestEntry, SubtitleCue, TransitionType } from "../../shared/types";
import { TRANSITIONS } from "../../shared/types";

/**
 * Single source of truth for frame math. Used by the server (manifest +
 * subtitles), the Remotion composition (calculateMetadata) and the editor
 * timeline, so scene/audio timing never drifts between engines.
 *
 * Remotion's TransitionSeries overlaps adjacent sequences for the length of
 * the transition, so the final duration is
 *   sum(sceneFrames) - sum(transitionFrames)
 */

export const secondsToFrames = (s: number, fps: number) => Math.max(1, Math.round(s * fps));

export function transitionFramesFor(type: TransitionType, fps: number, sceneA: number, sceneB: number) {
  const secs = TRANSITIONS[type]?.defaultSeconds ?? 0;
  const frames = Math.round(secs * fps);
  // A transition may never be longer than either neighbouring scene.
  return Math.max(0, Math.min(frames, sceneA - 1, sceneB - 1));
}

export interface TimelineEntry {
  sceneId: string;
  startFrame: number;
  durationInFrames: number;
  transitionOutFrames: number;
}

export function computeTimeline(
  scenes: Pick<SceneManifestEntry, "sceneId" | "durationInFrames" | "transition">[],
  fps: number,
): { entries: TimelineEntry[]; totalFrames: number } {
  const entries: TimelineEntry[] = [];
  let cursor = 0;
  scenes.forEach((s, i) => {
    const next = scenes[i + 1];
    const tOut = next ? transitionFramesFor(s.transition, fps, s.durationInFrames, next.durationInFrames) : 0;
    entries.push({ sceneId: s.sceneId, startFrame: cursor, durationInFrames: s.durationInFrames, transitionOutFrames: tOut });
    cursor += s.durationInFrames - tOut;
  });
  const last = entries[entries.length - 1];
  const totalFrames = last ? last.startFrame + last.durationInFrames : fps;
  return { entries, totalFrames };
}

export function manifestTotalFrames(manifest: SceneManifest) {
  return computeTimeline(manifest.scenes, manifest.fps).totalFrames;
}

/** Subtitles come from each scene's voice-over script (or headline if empty). */
export function buildSubtitleCues(scenes: Scene[], manifest: SceneManifest): SubtitleCue[] {
  const { entries } = computeTimeline(manifest.scenes, manifest.fps);
  const cues: SubtitleCue[] = [];
  const byId = new Map(scenes.map((s) => [s.id, s]));
  entries.forEach((e) => {
    const scene = byId.get(e.sceneId);
    const text = (scene?.voiceOver || "").trim();
    if (!text) return;
    // Split long lines into ≤ 2 sentence chunks spread across the scene.
    const parts = text
      .split(/(?<=[.!?])\s+/)
      .map((p) => p.trim())
      .filter(Boolean);
    const pad = Math.round(manifest.fps * 0.25);
    const usable = Math.max(1, e.durationInFrames - e.transitionOutFrames - pad * 2);
    const per = Math.floor(usable / parts.length);
    parts.forEach((p, i) => {
      const start = e.startFrame + pad + i * per;
      cues.push({ index: cues.length + 1, startFrame: start, endFrame: start + per - 2, text: p });
    });
  });
  return cues;
}

const pad2 = (n: number, l = 2) => String(n).padStart(l, "0");
export function framesToSrtTime(frame: number, fps: number) {
  const ms = Math.round((frame / fps) * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${pad2(ms % 1000, 3)}`;
}

export function cuesToSrt(cues: SubtitleCue[], fps: number) {
  return cues
    .map((c, i) => `${i + 1}\n${framesToSrtTime(c.startFrame, fps)} --> ${framesToSrtTime(c.endFrame, fps)}\n${c.text}\n`)
    .join("\n");
}
