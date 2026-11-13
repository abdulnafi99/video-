import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ExportRecord, MainCompositionProps, MediaAsset, Project, RenderJob, SceneManifest } from "../../shared/types";
import { FORMAT_DIMENSIONS } from "../../shared/types";
import { buildSubtitleCues, computeTimeline, cuesToSrt, secondsToFrames, transitionFramesFor } from "../../remotion/utils/timing";
import { compileSceneToDir } from "../services/hyperframesCompiler";
import { mediaFilePath, projectDir, ROOT } from "../services/paths";
import { probe } from "../services/probe";
import { Exports, Media, Projects } from "../storage/db";
import { runProcess } from "./processes";

const execFileP = promisify(execFile);
const HF_BIN = path.join(ROOT, "node_modules", "hyperframes", "bin", "hyperframes.mjs");
const TSX_BIN = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const SCENE_TIMEOUT_MS = 10 * 60_000;
const FINAL_TIMEOUT_MS = 30 * 60_000;

export interface JobContext {
  job: RenderJob;
  signal: AbortSignal;
  update: (patch: Partial<RenderJob>) => void;
  log: (msg: string) => void;
}

class ValidationError extends Error {}

/** Step 1 + 2: validate project configuration and media assets. */
export function validateProject(project: Project, media: MediaAsset[]) {
  const problems: string[] = [];
  if (!project.scenes.length) problems.push("Project has no scenes — generate a storyboard first.");
  const byId = new Map(media.map((m) => [m.id, m]));
  project.scenes.forEach((s, i) => {
    if (s.duration < 1.5) problems.push(`Scene ${i + 1} is shorter than 1.5s.`);
    if (!s.headline.trim() && s.template !== "logo-reveal") problems.push(`Scene ${i + 1} has no headline.`);
    for (const id of s.mediaIds) {
      const m = byId.get(id);
      if (!m) problems.push(`Scene ${i + 1} references missing media ${id}.`);
      else if (!fs.existsSync(mediaFilePath(m))) problems.push(`Media file for ${m.originalName} is missing on disk.`);
    }
  });
  const logo = project.brand.logoMediaId;
  if (logo && (!byId.get(logo) || !fs.existsSync(mediaFilePath(byId.get(logo)!)))) problems.push("Brand logo file is missing.");
  for (const t of [project.audio.music, project.audio.voiceOver]) {
    if (t && (!byId.get(t.mediaId) || !fs.existsSync(mediaFilePath(byId.get(t.mediaId)!)))) problems.push("An audio track file is missing.");
  }
  if (problems.length) throw new ValidationError(problems.join(" "));
}

function sha256(file: string) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

/** Steps 3–6 for one scene: compile, lint, render, verify. Returns the verified MP4 path. */
async function renderScene(ctx: JobContext, project: Project, sceneIdx: number, media: MediaAsset[], fps: number, quality: string, onPct: (p: number) => void) {
  const scene = project.scenes[sceneIdx];
  const base = path.join(projectDir(project.id), "scenes", scene.id);
  const compiled = compileSceneToDir(project, scene, media, base, fps);

  // Step 4: HyperFrames validation (lint must report zero errors)
  const lint = await runProcess(process.execPath, [HF_BIN, "lint", base, "--json"], { timeoutMs: 120_000, signal: ctx.signal });
  const jsonLine = lint.tail.join("\n");
  const m = jsonLine.match(/"errorCount"\s*:\s*(\d+)/);
  if (!m) throw new Error(`HyperFrames lint produced no report for scene ${sceneIdx + 1}`);
  if (Number(m[1]) > 0) throw new Error(`HyperFrames lint found ${m[1]} error(s) in scene ${sceneIdx + 1}: ${jsonLine.slice(0, 600)}`);

  // Step 5: render
  const out = path.join(base, "render.mp4");
  fs.rmSync(out, { force: true });
  const hfQuality = quality === "draft" ? "draft" : quality === "high" ? "high" : "standard";
  const res = await runProcess(
    process.execPath,
    [HF_BIN, "render", base, "-o", out, "-f", String(fps), "-q", hfQuality, "--workers", "2", "--no-browser-gpu"],
    {
      cwd: base,
      timeoutMs: SCENE_TIMEOUT_MS,
      signal: ctx.signal,
      env: { HYPERFRAMES_NO_UPDATE_CHECK: "1", NO_COLOR: "1" },
      onLine: (l) => {
        if (l.startsWith("@hf-progress ")) {
          try {
            const p = JSON.parse(l.slice(13)) as { pct?: number };
            if (typeof p.pct === "number") onPct(p.pct / 100);
          } catch {
            /* ignore malformed */
          }
        }
      },
    },
  );
  if (res.code !== 0) throw new Error(`HyperFrames render failed for scene ${sceneIdx + 1}: ${res.tail.slice(-8).join(" | ")}`);

  // Step 6: verify the output file
  if (!fs.existsSync(out)) throw new Error(`Scene ${sceneIdx + 1} produced no output file`);
  const info = await probe(out);
  const expectedFrames = secondsToFrames(scene.duration, fps);
  if (info.width !== compiled.width || info.height !== compiled.height) throw new Error(`Scene ${sceneIdx + 1} has wrong dimensions ${info.width}x${info.height}`);
  if (!info.duration || Math.abs(info.duration - scene.duration) > 2 / fps + 0.05) {
    throw new Error(`Scene ${sceneIdx + 1} duration ${info.duration?.toFixed(3)}s does not match ${scene.duration}s`);
  }
  fs.writeFileSync(path.join(base, "render.meta.json"), JSON.stringify({ htmlSha: sha256(compiled.htmlPath), fps, renderedAt: new Date().toISOString() }));
  ctx.log(`Scene ${sceneIdx + 1} verified: ${info.width}x${info.height} ${info.duration.toFixed(2)}s ${info.videoCodec} (${expectedFrames} frames expected)`);
  return { file: out, info };
}

/** Full 10-step pipeline. Throws on any failure — success is only reported after verification. */
export async function runFullRender(ctx: JobContext) {
  const { job } = ctx;
  const project = Projects.get(job.projectId);
  if (!project) throw new ValidationError("Project no longer exists");
  const media = Media.list(project.id);
  const fps = job.options.fps;
  const { width, height } = FORMAT_DIMENSIONS[project.format];
  const outDir = path.join(projectDir(project.id), "exports", job.id);
  fs.mkdirSync(outDir, { recursive: true });

  ctx.update({ stage: "Validating project configuration", progress: 1 });
  validateProject(project, media);
  ctx.log("Project and media validated");

  const scenes = job.kind === "scene-preview" ? project.scenes.filter((s) => s.id === job.sceneId) : project.scenes;
  if (!scenes.length) throw new ValidationError("Scene not found");
  const SCENE_SHARE = job.kind === "scene-preview" ? 0.97 : 0.68;

  const rendered: { sceneId: string; file: string }[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const idx = project.scenes.indexOf(scenes[i]);
    ctx.update({ stage: `Rendering scene ${i + 1} of ${scenes.length} (HyperFrames)`, currentScene: `${idx + 1}. ${scenes[i].headline.replace(/\|/g, " ")}` });
    const r = await renderScene(ctx, project, idx, media, fps, job.options.quality, (p) => {
      ctx.update({ progress: Math.round((1 + ((i + p) / scenes.length) * SCENE_SHARE * 100) * 10) / 10 });
    });
    rendered.push({ sceneId: scenes[i].id, file: r.file });
  }

  if (job.kind === "scene-preview") {
    ctx.update({ progress: 100, stage: "Scene preview ready", outputFile: rendered[0].file });
    return;
  }

  // Step 7: Remotion props
  ctx.update({ stage: "Building Remotion composition", currentScene: undefined, progress: 70 });
  const manifest: SceneManifest = {
    projectId: project.id,
    version: 1,
    width,
    height,
    fps,
    generatedAt: new Date().toISOString(),
    scenes: project.scenes.map((s, i) => {
      const file = rendered.find((r) => r.sceneId === s.id)!.file;
      const frames = secondsToFrames(s.duration, fps);
      const next = project.scenes[i + 1];
      return {
        sceneId: s.id,
        order: i,
        file: path.relative(projectDir(project.id), file),
        src: `scenes/${s.id}.mp4`, // served by the worker's local asset server
        duration: s.duration,
        durationInFrames: frames,
        width,
        height,
        fps,
        hasAudio: false,
        transition: s.transition,
        transitionFrames: next ? transitionFramesFor(s.transition, fps, frames, secondsToFrames(next.duration, fps)) : 0,
        sha256: sha256(file),
      };
    }),
  };
  const { totalFrames } = computeTimeline(manifest.scenes, fps);
  const cues = buildSubtitleCues(project.scenes, manifest);
  const assetMap: Record<string, string> = {};
  manifest.scenes.forEach((s, i) => (assetMap[s.src] = rendered[i].file));
  const audioTrack = (t: Project["audio"]["music"], key: string) => {
    if (!t) return undefined;
    const m = media.find((x) => x.id === t.mediaId)!;
    const rel = `audio/${key}${path.extname(m.fileName)}`;
    assetMap[rel] = mediaFilePath(m);
    return { src: rel, volume: t.volume, fadeIn: t.fadeIn, fadeOut: t.fadeOut, startFrame: Math.round(t.startAt * fps) };
  };
  const props: MainCompositionProps = {
    manifest,
    music: audioTrack(project.audio.music, "music"),
    voiceOver: audioTrack(project.audio.voiceOver, "voice"),
    sfx: project.audio.sfx.map((s, i) => {
      const m = media.find((x) => x.id === s.mediaId);
      if (!m) return null;
      const rel = `audio/sfx-${i}${path.extname(m.fileName)}`;
      assetMap[rel] = mediaFilePath(m);
      return { src: rel, startFrame: Math.round(s.at * fps), volume: s.volume };
    }).filter(Boolean) as MainCompositionProps["sfx"],
    subtitles: cues,
    showSubtitles: project.audio.subtitles,
    brand: { accent: project.brand.accentColor, text: project.brand.textColor, background: project.brand.backgroundColor, font: "Inter, sans-serif" },
  };
  const jobFile = path.join(outDir, "remotion-job.json");
  const finalFile = path.join(outDir, `${slug(project.name)}-${project.format.replace(":", "x")}-${fps}fps.mp4`);
  fs.writeFileSync(path.join(outDir, "scene-manifest.json"), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(jobFile, JSON.stringify({ props, assetMap, output: finalFile, quality: job.options.quality }, null, 2));

  // Step 8: Remotion render in an isolated worker process
  ctx.update({ stage: "Composing final video (Remotion)", progress: 71 });
  const res = await runProcess(process.execPath, [TSX_BIN, path.join(ROOT, "server", "jobs", "remotion-worker.ts"), jobFile], {
    cwd: ROOT,
    timeoutMs: FINAL_TIMEOUT_MS,
    signal: ctx.signal,
    onLine: (l) => {
      if (!l.startsWith("@progress ")) return;
      try {
        const p = JSON.parse(l.slice(10)) as { stage: string; p: number };
        ctx.update({ stage: p.stage, progress: Math.round((71 + p.p * 26) * 10) / 10 });
      } catch {
        /* ignore */
      }
    },
  });
  if (res.code !== 0) throw new Error(`Remotion render failed: ${res.tail.slice(-10).join(" | ")}`);

  // Step 9: validate final MP4
  ctx.update({ stage: "Validating final MP4", progress: 97.5 });
  if (!fs.existsSync(finalFile)) throw new Error("Remotion reported success but no output file exists");
  const info = await probe(finalFile);
  const expected = totalFrames / fps;
  if (info.width !== width || info.height !== height) throw new Error(`Final video has wrong size ${info.width}x${info.height}`);
  if (info.videoCodec !== "h264") throw new Error(`Final video codec is ${info.videoCodec}, expected h264`);
  if (!info.duration || Math.abs(info.duration - expected) > 0.25) throw new Error(`Final duration ${info.duration}s does not match expected ${expected.toFixed(2)}s`);
  if ((props.music || props.voiceOver) && !info.audioCodec) throw new Error("Final video is missing its audio track");
  ctx.log(`Final verified: ${info.width}x${info.height} ${info.duration.toFixed(2)}s ${info.videoCodec}/${info.audioCodec ?? "no audio"}`);

  // Step 10: export extras + metadata
  ctx.update({ stage: "Saving exports", progress: 98.5 });
  const thumb = path.join(outDir, "thumbnail.jpg");
  const thumbAt = thumbnailTime(project, manifest);
  await execFileP("ffmpeg", ["-y", "-v", "error", "-ss", thumbAt.toFixed(2), "-i", finalFile, "-frames:v", "1", "-q:v", "2", thumb], { timeout: 60_000 });
  const srt = path.join(outDir, "subtitles.srt");
  fs.writeFileSync(srt, cuesToSrt(cues, fps));
  const cfg = path.join(outDir, "project-config.json");
  fs.writeFileSync(cfg, JSON.stringify({ exportedAt: new Date().toISOString(), project, manifest }, null, 2));
  // social-ready lighter copy (720p short edge, faststart)
  const social = finalFile.replace(/\.mp4$/, "-social-720p.mp4");
  const scaleArg = width < height ? "720:-2" : "-2:720";
  await execFileP("ffmpeg", ["-y", "-v", "error", "-i", finalFile, "-vf", `scale=${scaleArg}:flags=lanczos`, "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", social], { timeout: 10 * 60_000 });

  const rec: ExportRecord = {
    id: job.id,
    projectId: project.id,
    projectName: project.name,
    jobId: job.id,
    file: path.relative(projectDir(project.id), finalFile),
    thumbnail: path.relative(projectDir(project.id), thumb),
    subtitles: path.relative(projectDir(project.id), srt),
    config: path.relative(projectDir(project.id), cfg),
    width,
    height,
    fps,
    duration: info.duration,
    size: fs.statSync(finalFile).size,
    videoCodec: info.videoCodec ?? "h264",
    audioCodec: info.audioCodec,
    createdAt: new Date().toISOString(),
  };
  Exports.save(rec);
  // project thumbnail for dashboard cards
  const p2 = Projects.get(project.id);
  if (p2) Projects.save({ ...p2, status: "completed", thumbnail: `/api/exports/${rec.id}/thumbnail`, updatedAt: new Date().toISOString() });
  fs.rmSync(jobFile, { force: true });
  ctx.update({ progress: 100, stage: "Completed — output verified", outputFile: finalFile });
}

function thumbnailTime(project: Project, manifest: SceneManifest) {
  const { entries } = computeTimeline(manifest.scenes, manifest.fps);
  const i = Math.max(0, project.scenes.findIndex((s) => s.template === "house-build-3d" || s.template === "product-showcase"));
  const e = entries[i] ?? entries[0];
  return (e.startFrame + e.durationInFrames * 0.85) / manifest.fps;
}

function slug(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "video";
}
