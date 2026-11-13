import fs from "node:fs";
import path from "node:path";
import type { MediaAsset } from "../../shared/types";

export const ROOT = path.resolve(import.meta.dirname, "..", "..");
export const DATA_DIR = path.resolve(process.env.CINEMOTION_DATA_DIR || path.join(ROOT, "data"));
export const MEDIA_DIR = path.join(DATA_DIR, "media");
export const PROJECTS_DIR = path.join(DATA_DIR, "projects");
export const TMP_DIR = path.join(DATA_DIR, "tmp");

for (const d of [DATA_DIR, MEDIA_DIR, PROJECTS_DIR, TMP_DIR]) fs.mkdirSync(d, { recursive: true });

const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;
export function assertId(id: string, what = "id"): string {
  if (!ID_RE.test(id)) throw Object.assign(new Error(`Invalid ${what}`), { status: 400 });
  return id;
}

/** Resolve a path and guarantee it stays inside `base` (path traversal guard). */
export function safeJoin(base: string, ...parts: string[]): string {
  const target = path.resolve(base, ...parts);
  const rel = path.relative(base, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw Object.assign(new Error("Path escapes storage root"), { status: 400 });
  }
  return target;
}

export function projectDir(projectId: string) {
  return safeJoin(PROJECTS_DIR, assertId(projectId, "project id"));
}

export function mediaFilePath(m: Pick<MediaAsset, "fileName">) {
  return safeJoin(MEDIA_DIR, path.basename(m.fileName));
}
