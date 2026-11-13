import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Router } from "express";
import type { MainCompositionProps, Project } from "../../shared/types";
import { FORMAT_DIMENSIONS } from "../../shared/types";
import { buildSubtitleCues, secondsToFrames, transitionFramesFor } from "../../remotion/utils/timing";
import { Exports, Jobs, Media, Projects } from "../storage/db";
import { createProject, updateProject } from "../services/projects";
import { generateStoryboard } from "../services/storyboard";
import { compileSceneToDir, previewHtml } from "../services/hyperframesCompiler";
import { assertId, projectDir, safeJoin } from "../services/paths";
import { enqueue } from "../jobs/queue";

export const projects = Router();

const load = (id: string): Project => {
  const p = Projects.get(assertId(id));
  if (!p) throw Object.assign(new Error("Project not found"), { status: 404 });
  return p;
};

projects.get("/", (_req, res) => res.json(Projects.list()));

projects.post("/", (req, res) => {
  const body = req.body ?? {};
  let project = createProject(body);
  if (body.generateStoryboard) {
    project = updateProject(project, { scenes: generateStoryboard(project, { includeBuild3d: Boolean(body.includeBuild3d) }) });
  }
  res.status(201).json(project);
});

projects.get("/:id", (req, res) => res.json(load(req.params.id)));

projects.patch("/:id", (req, res) => res.json(updateProject(load(req.params.id), req.body ?? {})));

projects.delete("/:id", (req, res) => {
  const p = load(req.params.id);
  if (Jobs.list(500).some((j) => j.projectId === p.id && (j.status === "running" || j.status === "queued"))) {
    return res.status(409).json({ error: "Project has active render jobs. Cancel them first." });
  }
  Projects.remove(p.id);
  fs.rmSync(projectDir(p.id), { recursive: true, force: true });
  res.json({ ok: true });
});

projects.post("/:id/duplicate", (req, res) => {
  const p = load(req.params.id);
  const copy = createProject({ ...p, name: `${p.name} (copy)`, scenes: p.scenes.map((s) => ({ ...s, id: crypto.randomUUID().slice(0, 12) })) });
  res.status(201).json(copy);
});

projects.post("/:id/storyboard", (req, res) => {
  const p = load(req.params.id);
  res.json(updateProject(p, { scenes: generateStoryboard(p, { includeBuild3d: Boolean(req.body?.includeBuild3d) }) }));
});

projects.post("/:id/render", (req, res) => {
  const p = load(req.params.id);
  res.status(202).json(enqueue(p.id, "full", { fps: req.body?.fps ?? p.fps, quality: req.body?.quality }));
});

projects.post("/:id/scenes/:sceneId/render", (req, res) => {
  const p = load(req.params.id);
  const scene = p.scenes.find((s) => s.id === req.params.sceneId);
  if (!scene) return res.status(404).json({ error: "Scene not found" });
  res.status(202).json(enqueue(p.id, "scene-preview", { fps: p.fps, quality: req.body?.quality ?? "draft" }, scene.id));
});

projects.get("/:id/exports", (req, res) => res.json(Exports.list().filter((e) => e.projectId === load(req.params.id).id)));

// ---- live HyperFrames scene preview (HTML iframe) -------------------------
const previewDir = (p: Project, sceneId: string) => safeJoin(projectDir(p.id), "preview", assertId(sceneId, "scene id"));

projects.get("/:id/scenes/:sceneId/preview/", (req, res) => {
  const p = load(req.params.id);
  const scene = p.scenes.find((s) => s.id === req.params.sceneId);
  if (!scene) return res.status(404).send("Scene not found");
  const dir = previewDir(p, scene.id);
  const compiled = compileSceneToDir(p, scene, Media.list(p.id), dir, p.fps);
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self'");
  res.type("html").send(previewHtml(compiled.htmlPath));
});

projects.get("/:id/scenes/:sceneId/preview/*file", (req, res) => {
  const p = load(req.params.id);
  const rel = (req.params as unknown as { file: string[] }).file.join("/");
  if (!/^(lib|assets)\//.test(rel)) return res.status(404).end();
  const file = safeJoin(previewDir(p, req.params.sceneId), rel);
  if (!fs.existsSync(file)) return res.status(404).end();
  res.sendFile(file);
});

projects.get("/:id/scenes/:sceneId/render.mp4", (req, res) => {
  const p = load(req.params.id);
  const file = safeJoin(projectDir(p.id), "scenes", assertId(req.params.sceneId, "scene id"), "render.mp4");
  if (!fs.existsSync(file)) return res.status(404).json({ error: "Scene has not been rendered" });
  res.sendFile(file);
});

/**
 * Props for the in-browser Remotion Player. A scene's rendered file is used
 * only if it was rendered from the scene's current HTML (hash match);
 * otherwise the Player shows a placeholder so the preview never lies.
 */
projects.get("/:id/preview-props", (req, res) => {
  const p = load(req.params.id);
  const media = Media.list(p.id);
  const fps = p.fps;
  const { width, height } = FORMAT_DIMENSIONS[p.format];
  const placeholders: MainCompositionProps["previewPlaceholders"] = {};
  const scenes = p.scenes.map((s, i) => {
    const dir = safeJoin(projectDir(p.id), "scenes", s.id);
    const renderFile = path.join(dir, "render.mp4");
    const metaFile = path.join(dir, "render.meta.json");
    let fresh = false;
    if (fs.existsSync(renderFile) && fs.existsSync(metaFile)) {
      const pv = compileSceneToDir(p, s, media, previewDir(p, s.id), fps);
      const html = fs.readFileSync(pv.htmlPath);
      const meta = JSON.parse(fs.readFileSync(metaFile, "utf8")) as { htmlSha: string; fps: number };
      fresh = meta.fps === fps && meta.htmlSha === crypto.createHash("sha256").update(html).digest("hex");
    }
    placeholders[s.id] = { headline: s.headline, template: s.template };
    const frames = secondsToFrames(s.duration, fps);
    const next = p.scenes[i + 1];
    return {
      sceneId: s.id, order: i, file: "", src: fresh ? `/api/projects/${p.id}/scenes/${s.id}/render.mp4?v=${fs.statSync(renderFile).mtimeMs}` : "",
      duration: s.duration, durationInFrames: frames, width, height, fps, hasAudio: false, transition: s.transition,
      transitionFrames: next ? transitionFramesFor(s.transition, fps, frames, secondsToFrames(next.duration, fps)) : 0,
    };
  });
  const manifest = { projectId: p.id, version: 1 as const, width, height, fps, scenes, generatedAt: new Date().toISOString() };
  const track = (t: Project["audio"]["music"]) =>
    t && media.some((m) => m.id === t.mediaId)
      ? { src: `/api/media/${t.mediaId}/file`, volume: t.volume, fadeIn: t.fadeIn, fadeOut: t.fadeOut, startFrame: Math.round(t.startAt * fps) }
      : undefined;
  const props: MainCompositionProps = {
    manifest,
    music: track(p.audio.music),
    voiceOver: track(p.audio.voiceOver),
    sfx: p.audio.sfx.filter((s) => media.some((m) => m.id === s.mediaId)).map((s) => ({ src: `/api/media/${s.mediaId}/file`, startFrame: Math.round(s.at * fps), volume: s.volume })),
    subtitles: buildSubtitleCues(p.scenes, manifest),
    showSubtitles: p.audio.subtitles,
    brand: { accent: p.brand.accentColor, text: p.brand.textColor, background: p.brand.backgroundColor, font: "Inter, sans-serif" },
    previewPlaceholders: placeholders,
  };
  res.json({ props, renderedScenes: scenes.filter((s) => s.src).length });
});
