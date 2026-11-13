// Shared domain types used by the frontend, the Express API, the HyperFrames
// scene compiler and the Remotion composition. Keep this file free of runtime
// imports so every environment can consume it.

export type AspectFormat = "9:16" | "16:9" | "1:1";

export const FORMAT_DIMENSIONS: Record<AspectFormat, { width: number; height: number; label: string }> = {
  "9:16": { width: 1080, height: 1920, label: "Vertical 9:16" },
  "16:9": { width: 1920, height: 1080, label: "Landscape 16:9" },
  "1:1": { width: 1080, height: 1080, label: "Square 1:1" },
};

export type VisualStyle =
  | "premium-cinematic"
  | "apple-minimal"
  | "luxury-commercial"
  | "futuristic-tech"
  | "saas-showcase";

export const VISUAL_STYLES: Record<VisualStyle, { label: string; description: string }> = {
  "premium-cinematic": { label: "Premium cinematic", description: "Deep blacks, warm key light, slow confident moves." },
  "apple-minimal": { label: "Apple-inspired minimalist", description: "Generous whitespace, one idea per frame, crisp type." },
  "luxury-commercial": { label: "Luxury commercial", description: "Gold accents, light sweeps, elegant serif-free type." },
  "futuristic-tech": { label: "Futuristic technology", description: "Grids, particles, cool rim light, precise motion." },
  "saas-showcase": { label: "Premium SaaS showcase", description: "Floating UI panels, soft depth and clean feature callouts." },
};

export type SceneTemplateId =
  | "logo-reveal"
  | "cinematic-intro"
  | "product-showcase"
  | "feature-showcase"
  | "ui-demonstration"
  | "floating-product"
  | "typography-statement"
  | "final-cta"
  | "house-build-3d";

export type TransitionType = "crossfade" | "fade-black" | "slide" | "dissolve" | "match-cut";

export const TRANSITIONS: Record<TransitionType, { label: string; defaultSeconds: number }> = {
  crossfade: { label: "Crossfade", defaultSeconds: 0.6 },
  "fade-black": { label: "Fade to black", defaultSeconds: 0.8 },
  slide: { label: "Smooth slide", defaultSeconds: 0.7 },
  dissolve: { label: "Cinematic dissolve", defaultSeconds: 0.9 },
  "match-cut": { label: "Match cut", defaultSeconds: 0 },
};

export type AnimationPreset = "gentle" | "cinematic" | "dynamic";

export interface Scene {
  id: string;
  order: number;
  template: SceneTemplateId;
  duration: number; // seconds
  headline: string;
  subline: string;
  bullets: string[];
  visualDescription: string;
  cameraMovement: string;
  animationDirection: string;
  animationPreset: AnimationPreset;
  transition: TransitionType; // transition INTO the next scene
  audioDirection: string;
  voiceOver: string;
  mediaIds: string[]; // images / videos used by this scene
  variant?: string; // template-specific variant (e.g. 3D build vs showcase)
  accent?: string;
}

export interface BrandKit {
  brandName: string;
  logoMediaId?: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  handle?: string;
  website?: string;
  location?: string;
}

export type MediaKind = "image" | "video" | "audio";
export type MediaRole =
  | "logo"
  | "product-image"
  | "product-video"
  | "screenshot"
  | "background"
  | "music"
  | "voice-over"
  | "sfx"
  | "other";

export interface MediaAsset {
  id: string;
  projectId: string | null; // null = global library
  kind: MediaKind;
  role: MediaRole;
  originalName: string;
  fileName: string; // stored, sanitized name
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  license?: string;
  createdAt: string;
}

export interface AudioTrackSettings {
  mediaId: string;
  volume: number; // 0..1
  fadeIn: number; // seconds
  fadeOut: number; // seconds
  startAt: number; // seconds into the final video
}

export interface SfxPlacement {
  id: string;
  mediaId: string;
  at: number; // seconds into the final video
  volume: number;
}

export interface AudioSettings {
  music?: AudioTrackSettings;
  voiceOver?: AudioTrackSettings;
  sfx: SfxPlacement[];
  subtitles: boolean;
}

export type ProjectStatus = "draft" | "storyboard" | "rendering" | "completed" | "failed";

export interface Project {
  id: string;
  name: string;
  brandName: string;
  productName: string;
  description: string;
  objective: string;
  audience: string;
  format: AspectFormat;
  duration: number; // target seconds
  fps: 30 | 60;
  style: VisualStyle;
  language: "ms" | "en";
  brand: BrandKit;
  scenes: Scene[];
  audio: AudioSettings;
  status: ProjectStatus;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- HyperFrames ↔ Remotion interface ------------------------------------

/** One rendered HyperFrames scene, as consumed by Remotion. */
export interface SceneManifestEntry {
  sceneId: string;
  order: number;
  file: string; // path relative to the project render dir, or URL in preview
  src: string; // URL Remotion should load (http(s):// or staticFile path)
  duration: number; // seconds
  durationInFrames: number;
  width: number;
  height: number;
  fps: number;
  hasAudio: boolean;
  transition: TransitionType;
  transitionFrames: number;
  sha256?: string;
}

export interface SceneManifest {
  projectId: string;
  version: 1;
  width: number;
  height: number;
  fps: number;
  scenes: SceneManifestEntry[];
  generatedAt: string;
}

export interface SubtitleCue {
  index: number;
  startFrame: number;
  endFrame: number;
  text: string;
}

export interface AudioLayerProps {
  src: string;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  startFrame: number;
}

/** Props passed to the Remotion "CinemotionMain" composition. */
export interface MainCompositionProps {
  [key: string]: unknown;
  manifest: SceneManifest;
  music?: AudioLayerProps;
  voiceOver?: AudioLayerProps;
  sfx: { src: string; startFrame: number; volume: number }[];
  subtitles: SubtitleCue[];
  showSubtitles: boolean;
  brand: { accent: string; text: string; background: string; font: string };
  previewPlaceholders?: Record<string, { headline: string; template: string }>;
}

// ---- Render jobs ------------------------------------------------------------

export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type JobKind = "full" | "scene-preview";

export interface RenderJob {
  id: string;
  projectId: string;
  projectName?: string;
  kind: JobKind;
  sceneId?: string;
  status: JobStatus;
  progress: number; // 0..100
  stage: string;
  currentScene?: string;
  error?: string;
  log: string[];
  options: RenderOptions;
  outputFile?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface RenderOptions {
  fps: 30 | 60;
  quality: "draft" | "standard" | "high";
}

export interface ExportRecord {
  id: string;
  projectId: string;
  projectName?: string;
  jobId: string;
  file: string;
  thumbnail?: string;
  subtitles?: string;
  config?: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  size: number;
  videoCodec: string;
  audioCodec?: string;
  createdAt: string;
}
