import fs from "node:fs";
import path from "node:path";
import type { MediaAsset, Project, Scene } from "../../shared/types";
import { FORMAT_DIMENSIONS } from "../../shared/types";
import { compileScene } from "../../hyperframes/templates";
import { PREVIEW_DRIVER } from "../../hyperframes/templates/shell";
import { mediaFilePath, ROOT } from "./paths";

const nm = (...p: string[]) => path.join(ROOT, "node_modules", ...p);

/** Libraries are vendored from node_modules at pinned versions — never fetched at render time. */
const LIBS: Record<string, () => string> = {
  "gsap.min.js": () => nm("gsap", "dist", "gsap.min.js"),
  "three.module.js": () => nm("three", "build", "three.module.js"),
  "three.core.js": () => nm("three", "build", "three.core.js"),
};
const FONTS: Record<string, string> = {
  "inter-400.woff2": "@fontsource/inter/files/inter-latin-400-normal.woff2",
  "inter-500.woff2": "@fontsource/inter/files/inter-latin-500-normal.woff2",
  "inter-600.woff2": "@fontsource/inter/files/inter-latin-600-normal.woff2",
  "inter-700.woff2": "@fontsource/inter/files/inter-latin-700-normal.woff2",
  "space-grotesk-500.woff2": "@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff2",
  "space-grotesk-600.woff2": "@fontsource/space-grotesk/files/space-grotesk-latin-600-normal.woff2",
  "space-grotesk-700.woff2": "@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2",
};

function resolveFont(spec: string) {
  return nm(...spec.split("/"));
}

function copyIfChanged(src: string, dst: string) {
  if (fs.existsSync(dst) && fs.statSync(dst).size === fs.statSync(src).size) return;
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

export interface CompiledScene {
  sceneId: string;
  dir: string;
  htmlPath: string;
  width: number;
  height: number;
  duration: number;
  fps: number;
}

/**
 * Generate a self-contained HyperFrames composition folder for one scene:
 *   <dir>/index.html, <dir>/lib/*, <dir>/assets/*
 * Media are copied in (not linked) so the render process only reads inside <dir>.
 */
export function compileSceneToDir(
  project: Project,
  scene: Scene,
  media: MediaAsset[],
  dir: string,
  fps: number,
): CompiledScene {
  const { width, height } = FORMAT_DIMENSIONS[project.format];
  fs.mkdirSync(path.join(dir, "assets"), { recursive: true });
  const byId = new Map(media.map((m) => [m.id, m]));

  const placeAsset = (m: MediaAsset | undefined) => {
    if (!m) return undefined;
    const src = mediaFilePath(m);
    if (!fs.existsSync(src)) return undefined;
    const rel = `assets/${m.fileName}`;
    copyIfChanged(src, path.join(dir, rel));
    return rel;
  };

  // Light-stage scenes use the original logo; dark scenes prefer a dark-safe variant when present.
  const logoAsset = project.brand.logoMediaId ? byId.get(project.brand.logoMediaId) : undefined;
  const sceneMedia = scene.mediaIds.map((id) => byId.get(id)).filter(Boolean) as MediaAsset[];
  const assets = {
    logo: placeAsset(logoAsset),
    images: sceneMedia.filter((m) => m.kind === "image").map(placeAsset).filter(Boolean) as string[],
    videos: sceneMedia.filter((m) => m.kind === "video").map(placeAsset).filter(Boolean) as string[],
  };

  const { html, libs } = compileScene({
    scene,
    project,
    brand: project.brand,
    width,
    height,
    fps,
    duration: scene.duration,
    assets,
  });

  for (const lib of ["gsap.min.js", ...libs]) {
    const resolver = LIBS[lib];
    if (!resolver) throw new Error(`Unknown scene library ${lib}`);
    copyIfChanged(resolver(), path.join(dir, "lib", lib));
  }
  for (const [name, spec] of Object.entries(FONTS)) copyIfChanged(resolveFont(spec), path.join(dir, "lib", "fonts", name));

  const htmlPath = path.join(dir, "index.html");
  fs.writeFileSync(htmlPath, html);
  return { sceneId: scene.id, dir, htmlPath, width, height, duration: scene.duration, fps };
}

/** HTML for the dashboard's live preview iframe: same document + loop driver. */
export function previewHtml(htmlPath: string) {
  const html = fs.readFileSync(htmlPath, "utf8");
  return html.replace("</body>", `${PREVIEW_DRIVER}\n</body>`);
}
