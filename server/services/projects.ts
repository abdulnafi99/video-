import crypto from "node:crypto";
import type {
  AnimationPreset, AspectFormat, AudioSettings, BrandKit, Project, Scene, SceneTemplateId, TransitionType, VisualStyle,
} from "../../shared/types";
import { FORMAT_DIMENSIONS, TRANSITIONS, VISUAL_STYLES } from "../../shared/types";
import { TEMPLATE_META } from "../../hyperframes/templates";
import { Projects } from "../storage/db";

/** Strip control characters and clamp length. Text is HTML-escaped again at template time. */
export function cleanText(v: unknown, max = 400): string {
  return String(v ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}
const cleanColor = (v: unknown, fb: string) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fb);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fb: T): T => (allowed.includes(v as T) ? (v as T) : fb);
const num = (v: unknown, min: number, max: number, fb: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb;
};

const TEMPLATE_IDS = TEMPLATE_META.map((t) => t.id) as SceneTemplateId[];
const TRANSITION_IDS = Object.keys(TRANSITIONS) as TransitionType[];
const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

export function cleanScene(s: Partial<Scene>, order: number): Scene {
  return {
    id: typeof s.id === "string" && ID_RE.test(s.id) ? s.id : crypto.randomUUID().slice(0, 12),
    order,
    template: oneOf(s.template, TEMPLATE_IDS, "typography-statement"),
    duration: Math.round(num(s.duration, 1.5, 30, 4) * 10) / 10,
    headline: cleanText(s.headline, 140),
    subline: cleanText(s.subline, 220),
    bullets: (Array.isArray(s.bullets) ? s.bullets : []).slice(0, 5).map((b) => cleanText(b, 80)).filter(Boolean),
    visualDescription: cleanText(s.visualDescription, 400),
    cameraMovement: cleanText(s.cameraMovement, 120),
    animationDirection: cleanText(s.animationDirection, 300),
    animationPreset: oneOf<AnimationPreset>(s.animationPreset, ["gentle", "cinematic", "dynamic"], "cinematic"),
    transition: oneOf(s.transition, TRANSITION_IDS, "crossfade"),
    audioDirection: cleanText(s.audioDirection, 200),
    voiceOver: cleanText(s.voiceOver, 400),
    mediaIds: (Array.isArray(s.mediaIds) ? s.mediaIds : []).filter((id) => typeof id === "string" && ID_RE.test(id)).slice(0, 6),
    variant: s.variant ? cleanText(s.variant, 24) : undefined,
  };
}

export function cleanBrand(b: Partial<BrandKit> | undefined, brandName: string): BrandKit {
  return {
    brandName: cleanText(b?.brandName ?? brandName, 80),
    logoMediaId: typeof b?.logoMediaId === "string" && ID_RE.test(b.logoMediaId) ? b.logoMediaId : undefined,
    primaryColor: cleanColor(b?.primaryColor, "#C6A76B"),
    accentColor: cleanColor(b?.accentColor, "#C6A76B"),
    backgroundColor: cleanColor(b?.backgroundColor, "#08090C"),
    textColor: cleanColor(b?.textColor, "#F5F5F7"),
    headingFont: oneOf(b?.headingFont, ["Space Grotesk", "Inter"], "Space Grotesk"),
    bodyFont: oneOf(b?.bodyFont, ["Inter", "Space Grotesk"], "Inter"),
    handle: b?.handle ? cleanText(b.handle, 60) : undefined,
    website: b?.website ? cleanText(b.website, 80) : undefined,
    location: b?.location ? cleanText(b.location, 80) : undefined,
  };
}

function cleanAudio(a: Partial<AudioSettings> | undefined): AudioSettings {
  const track = (t: AudioSettings["music"]) =>
    t && typeof t.mediaId === "string" && ID_RE.test(t.mediaId)
      ? { mediaId: t.mediaId, volume: num(t.volume, 0, 1, 0.7), fadeIn: num(t.fadeIn, 0, 10, 1), fadeOut: num(t.fadeOut, 0, 10, 1.5), startAt: num(t.startAt, 0, 600, 0) }
      : undefined;
  return {
    music: track(a?.music),
    voiceOver: track(a?.voiceOver),
    sfx: (Array.isArray(a?.sfx) ? a!.sfx : [])
      .filter((s) => typeof s.mediaId === "string" && ID_RE.test(s.mediaId))
      .slice(0, 40)
      .map((s) => ({ id: ID_RE.test(String(s.id)) ? s.id : crypto.randomUUID().slice(0, 8), mediaId: s.mediaId, at: num(s.at, 0, 600, 0), volume: num(s.volume, 0, 1, 0.6) })),
    subtitles: Boolean(a?.subtitles),
  };
}

export function createProject(input: Partial<Project>): Project {
  const now = new Date().toISOString();
  const brandName = cleanText(input.brandName, 80) || "Untitled brand";
  const project: Project = {
    id: crypto.randomUUID().replace(/-/g, "").slice(0, 14),
    name: cleanText(input.name, 100) || "Untitled project",
    brandName,
    productName: cleanText(input.productName, 80),
    description: cleanText(input.description, 1200),
    objective: cleanText(input.objective, 300),
    audience: cleanText(input.audience, 200),
    format: oneOf<AspectFormat>(input.format, Object.keys(FORMAT_DIMENSIONS) as AspectFormat[], "9:16"),
    duration: num(input.duration, 6, 180, 30),
    fps: input.fps === 60 ? 60 : 30,
    style: oneOf<VisualStyle>(input.style, Object.keys(VISUAL_STYLES) as VisualStyle[], "premium-cinematic"),
    language: input.language === "en" ? "en" : "ms",
    brand: cleanBrand(input.brand, brandName),
    scenes: (input.scenes ?? []).map((s, i) => cleanScene(s, i)),
    audio: cleanAudio(input.audio),
    status: input.scenes?.length ? "storyboard" : "draft",
    createdAt: now,
    updatedAt: now,
  };
  return Projects.save(project);
}

/** Apply a validated partial update. Unknown fields are ignored. */
export function updateProject(existing: Project, patch: Partial<Project>): Project {
  const merged: Project = {
    ...existing,
    name: patch.name !== undefined ? cleanText(patch.name, 100) || existing.name : existing.name,
    brandName: patch.brandName !== undefined ? cleanText(patch.brandName, 80) : existing.brandName,
    productName: patch.productName !== undefined ? cleanText(patch.productName, 80) : existing.productName,
    description: patch.description !== undefined ? cleanText(patch.description, 1200) : existing.description,
    objective: patch.objective !== undefined ? cleanText(patch.objective, 300) : existing.objective,
    audience: patch.audience !== undefined ? cleanText(patch.audience, 200) : existing.audience,
    format: patch.format ? oneOf<AspectFormat>(patch.format, Object.keys(FORMAT_DIMENSIONS) as AspectFormat[], existing.format) : existing.format,
    duration: patch.duration !== undefined ? num(patch.duration, 6, 180, existing.duration) : existing.duration,
    fps: patch.fps !== undefined ? (patch.fps === 60 ? 60 : 30) : existing.fps,
    style: patch.style ? oneOf<VisualStyle>(patch.style, Object.keys(VISUAL_STYLES) as VisualStyle[], existing.style) : existing.style,
    language: patch.language ? (patch.language === "en" ? "en" : "ms") : existing.language,
    brand: patch.brand ? cleanBrand({ ...existing.brand, ...patch.brand }, existing.brandName) : existing.brand,
    scenes: patch.scenes ? patch.scenes.slice(0, 30).map((s, i) => cleanScene(s, i)) : existing.scenes,
    audio: patch.audio ? cleanAudio({ ...existing.audio, ...patch.audio }) : existing.audio,
    status: patch.scenes && existing.status === "draft" ? "storyboard" : existing.status,
    updatedAt: new Date().toISOString(),
  };
  return Projects.save(merged);
}
