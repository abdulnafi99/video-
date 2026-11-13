import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Router } from "express";
import multer from "multer";
import type { Project, Scene, SceneTemplateId } from "../../shared/types";
import { FORMAT_DIMENSIONS } from "../../shared/types";
import { TEMPLATE_META } from "../../hyperframes/templates";
import { Exports, Jobs, Media, Projects, Settings } from "../storage/db";
import { ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES, deleteMedia, ingestFile } from "../services/media";
import { assertId, DATA_DIR, mediaFilePath, projectDir, safeJoin, TMP_DIR } from "../services/paths";
import { compileSceneToDir, previewHtml } from "../services/hyperframesCompiler";
import { renderToM4a, synthAmbientBed, synthWhoosh } from "../services/music";
import { cancel, enqueue, onJobUpdate, retry } from "../jobs/queue";
import { cleanText } from "../services/projects";

export const api = Router();

// ---- stats ------------------------------------------------------------------
api.get("/stats", (_req, res) => {
  const projects = Projects.list();
  const jobs = Jobs.list(500);
  res.json({
    totalProjects: projects.length,
    completedVideos: Exports.list().length,
    renderingJobs: jobs.filter((j) => j.status === "running" || j.status === "queued").length,
    failedJobs: jobs.filter((j) => j.status === "failed").length,
    recentProjects: projects.slice(0, 6),
  });
});

// ---- templates ----------------------------------------------------------------
api.get("/templates", (_req, res) => res.json(TEMPLATE_META));

const SAMPLE: Record<SceneTemplateId, Partial<Scene>> = {
  "cinematic-intro": { headline: "Create something timeless", subline: "A new standard for premium storytelling." },
  "logo-reveal": { headline: "Cinemotion Studio", subline: "Create. Animate. Inspire.", variant: "dark" },
  "product-showcase": { headline: "Crafted in detail", subline: "Every frame considered." },
  "feature-showcase": { headline: "Built for creators", subline: "Highlights", bullets: ["Cinematic scene engine", "Frame-accurate composition", "Studio-grade export", "Brand kit built in"] },
  "ui-demonstration": { headline: "Effortless by design" },
  "floating-product": { headline: "Light as air", subline: "Weightless motion, real depth." },
  "typography-statement": { headline: "Less noise.|More meaning.", subline: "Design that speaks quietly." },
  "final-cta": { headline: "Start creating today", subline: "Your next launch film is minutes away.", bullets: ["Get started"] },
  "house-build-3d": { headline: "Built with precision", subline: "3D build sequence", bullets: ["Base", "Frame", "Walls", "Roof", "Done"], variant: "build" },
};

api.get("/templates/:id/preview/", (req, res) => {
  const meta = TEMPLATE_META.find((t) => t.id === req.params.id);
  if (!meta) return res.status(404).send("Unknown template");
  const format = (["9:16", "16:9", "1:1"].includes(String(req.query.format)) ? req.query.format : "16:9") as Project["format"];
  const project = {
    id: "template-preview", name: meta.label, brandName: "Cinemotion", productName: "Cinemotion Studio", format, fps: 30, style: "premium-cinematic", language: "en",
    brand: { brandName: "Cinemotion", primaryColor: "#C6A76B", accentColor: "#C6A76B", backgroundColor: "#08090C", textColor: "#F5F5F7", headingFont: "Space Grotesk", bodyFont: "Inter", handle: "@cinemotion", location: "Worldwide" },
  } as unknown as Project;
  const scene: Scene = {
    id: `tpl-${meta.id}`, order: 0, template: meta.id, duration: meta.defaultDuration, headline: "", subline: "", bullets: [], visualDescription: "", cameraMovement: "",
    animationDirection: "", animationPreset: "cinematic", transition: "crossfade", audioDirection: "", voiceOver: "", mediaIds: [], ...SAMPLE[meta.id],
  };
  const dir = path.join(DATA_DIR, "template-previews", `${meta.id}-${format.replace(":", "x")}`);
  const compiled = compileSceneToDir(project, scene, [], dir, 30);
  res.type("html").send(previewHtml(compiled.htmlPath));
});
api.get("/templates/:id/preview/*file", (req, res) => {
  const rel = (req.params as unknown as { file: string[] }).file.join("/");
  if (!/^lib\//.test(rel)) return res.status(404).end();
  const fmt = (["9:16", "16:9", "1:1"].includes(String(req.query.format)) ? String(req.query.format) : "16:9").replace(":", "x");
  const base = path.join(DATA_DIR, "template-previews", `${assertId(req.params.id)}-${fmt}`);
  const dirs = fs.existsSync(base) ? [base] : fs.readdirSync(path.join(DATA_DIR, "template-previews")).filter((d) => d.startsWith(req.params.id)).map((d) => path.join(DATA_DIR, "template-previews", d));
  for (const d of dirs) {
    const f = safeJoin(d, rel);
    if (fs.existsSync(f)) return res.sendFile(f);
  }
  res.status(404).end();
});

// ---- media ------------------------------------------------------------------
const upload = multer({
  dest: TMP_DIR,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 10 },
  fileFilter: (_req, file, cb) => cb(null, ALLOWED_EXTENSIONS.includes(path.extname(file.originalname).toLowerCase())),
});

api.get("/media", (req, res) => {
  const pid = typeof req.query.projectId === "string" ? assertId(req.query.projectId) : undefined;
  res.json(Media.list(pid));
});

api.post("/media", upload.array("files", 10), async (req, res) => {
  const files = (req.files as Express.Multer.File[]) ?? [];
  if (!files.length) return res.status(400).json({ error: `No acceptable files. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` });
  const projectId = typeof req.body.projectId === "string" && req.body.projectId ? assertId(req.body.projectId) : null;
  const out = [];
  const errors: string[] = [];
  for (const f of files) {
    try {
      out.push(await ingestFile({ tempPath: f.path, originalName: f.originalname, projectId, role: req.body.role, license: req.body.license }));
    } catch (e) {
      errors.push(`${path.basename(f.originalname)}: ${(e as Error).message}`);
    }
  }
  res.status(out.length ? 201 : 400).json({ assets: out, errors });
});

api.patch("/media/:id", (req, res) => {
  const m = Media.get(assertId(req.params.id));
  if (!m) return res.status(404).json({ error: "Not found" });
  const roles = ["logo", "product-image", "product-video", "screenshot", "background", "music", "voice-over", "sfx", "other"];
  res.json(Media.save({ ...m, role: roles.includes(req.body?.role) ? req.body.role : m.role, license: req.body?.license !== undefined ? cleanText(req.body.license, 200) : m.license }));
});

api.delete("/media/:id", (req, res) => res.json({ ok: deleteMedia(assertId(req.params.id)) }));

api.get("/media/:id/file", (req, res) => {
  const m = Media.get(assertId(req.params.id));
  if (!m) return res.status(404).end();
  res.type(m.mimeType);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.sendFile(mediaFilePath(m));
});

/** Generate an original, copyright-free music bed or whoosh SFX. */
api.post("/audio/generate", async (req, res) => {
  const kind = req.body?.kind === "whoosh" ? "whoosh" : "ambient";
  const seconds = Math.min(180, Math.max(5, Number(req.body?.seconds) || 30));
  const projectId = typeof req.body?.projectId === "string" ? assertId(req.body.projectId) : null;
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const tmp = path.join(TMP_DIR, `${id}.m4a`);
  await renderToM4a(kind === "whoosh" ? synthWhoosh() : synthAmbientBed(seconds), tmp, kind === "whoosh" ? -20 : -16);
  const asset = await ingestFile({
    tempPath: tmp,
    originalName: kind === "whoosh" ? "Whoosh (generated).m4a" : `Ambient bed ${Math.round(seconds)}s (generated).m4a`,
    projectId,
    role: kind === "whoosh" ? "sfx" : "music",
    license: "Original — procedurally generated by Cinemotion Studio, royalty-free",
  });
  res.status(201).json(asset);
});

// ---- jobs ---------------------------------------------------------------------
api.get("/jobs", (_req, res) => res.json(Jobs.list(100)));
api.get("/jobs/stream", (req, res) => {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  res.write(":ok\n\n");
  const off = onJobUpdate((j) => res.write(`data: ${JSON.stringify(j)}\n\n`));
  const ping = setInterval(() => res.write(":ping\n\n"), 20_000);
  req.on("close", () => {
    off();
    clearInterval(ping);
  });
});
api.get("/jobs/:id", (req, res) => {
  const j = Jobs.get(assertId(req.params.id));
  return j ? res.json(j) : res.status(404).json({ error: "Not found" });
});
api.post("/jobs/:id/cancel", (req, res) => {
  const j = cancel(assertId(req.params.id));
  return j ? res.json(j) : res.status(404).json({ error: "Not found" });
});
api.post("/jobs/:id/retry", (req, res) => {
  const j = retry(assertId(req.params.id));
  return j ? res.status(202).json(j) : res.status(400).json({ error: "Only failed or cancelled jobs can be retried" });
});
api.get("/jobs/:id/output", (req, res) => {
  const j = Jobs.get(assertId(req.params.id));
  if (!j?.outputFile || j.status !== "completed") return res.status(404).end();
  const file = safeJoin(projectDir(j.projectId), path.relative(projectDir(j.projectId), j.outputFile));
  if (!fs.existsSync(file)) return res.status(404).end();
  res.sendFile(file);
});

// ---- exports ------------------------------------------------------------------
api.get("/exports", (_req, res) => res.json(Exports.list()));
const exportFile = (id: string, key: "file" | "thumbnail" | "subtitles" | "config" | "social") => {
  const e = Exports.get(assertId(id));
  if (!e) return undefined;
  const rel = key === "social" ? e.file.replace(/\.mp4$/, "-social-720p.mp4") : e[key];
  if (!rel) return undefined;
  const f = safeJoin(projectDir(e.projectId), rel);
  return fs.existsSync(f) ? f : undefined;
};
for (const [route, key, download] of [
  ["video", "file", true], ["social", "social", true], ["thumbnail", "thumbnail", false], ["subtitles", "subtitles", true], ["config", "config", true], ["stream", "file", false],
] as const) {
  api.get(`/exports/:id/${route}`, (req, res) => {
    const f = exportFile(req.params.id, key);
    if (!f) return res.status(404).json({ error: "File not found" });
    return download ? res.download(f, path.basename(f)) : res.sendFile(f);
  });
}

// ---- settings -----------------------------------------------------------------
api.get("/settings", (_req, res) => res.json({ defaultQuality: "standard", defaultFps: 30, ...Settings.all() }));
api.put("/settings", (req, res) => {
  const b = req.body ?? {};
  if (["draft", "standard", "high"].includes(b.defaultQuality)) Settings.set("defaultQuality", b.defaultQuality);
  if ([30, 60].includes(b.defaultFps)) Settings.set("defaultFps", b.defaultFps);
  res.json(Settings.all());
});

// convenience for quick renders from other tools
api.post("/render/:projectId", (req, res) => res.status(202).json(enqueue(assertId(req.params.projectId), "full", req.body ?? {})));

export const formatInfo = FORMAT_DIMENSIONS;
