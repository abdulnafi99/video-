import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { MediaAsset, MediaKind, MediaRole } from "../../shared/types";
import { Media } from "../storage/db";
import { MEDIA_DIR, mediaFilePath } from "./paths";
import { probe } from "./probe";

/** Allowed upload types, identified by extension AND magic bytes. Scripts/HTML/SVG are never accepted. */
const TYPES: Record<string, { kind: MediaKind; mime: string; maxMb: number; magic: (b: Buffer) => boolean }> = {
  ".png": { kind: "image", mime: "image/png", maxMb: 25, magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  ".jpg": { kind: "image", mime: "image/jpeg", maxMb: 25, magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  ".jpeg": { kind: "image", mime: "image/jpeg", maxMb: 25, magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  ".webp": { kind: "image", mime: "image/webp", maxMb: 25, magic: (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
  ".mp4": { kind: "video", mime: "video/mp4", maxMb: 500, magic: (b) => b.toString("ascii", 4, 8) === "ftyp" },
  ".mov": { kind: "video", mime: "video/quicktime", maxMb: 500, magic: (b) => ["ftyp", "moov", "wide", "mdat", "free"].includes(b.toString("ascii", 4, 8)) },
  ".webm": { kind: "video", mime: "video/webm", maxMb: 500, magic: (b) => b.readUInt32BE(0) === 0x1a45dfa3 },
  ".mp3": { kind: "audio", mime: "audio/mpeg", maxMb: 60, magic: (b) => b.toString("ascii", 0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  ".wav": { kind: "audio", mime: "audio/wav", maxMb: 120, magic: (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WAVE" },
  ".m4a": { kind: "audio", mime: "audio/mp4", maxMb: 60, magic: (b) => b.toString("ascii", 4, 8) === "ftyp" },
  ".aac": { kind: "audio", mime: "audio/aac", maxMb: 60, magic: (b) => b[0] === 0xff && (b[1] & 0xf6) === 0xf0 },
};

export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = Object.keys(TYPES);

const ROLES: MediaRole[] = ["logo", "product-image", "product-video", "screenshot", "background", "music", "voice-over", "sfx", "other"];

export function sanitizeName(name: string) {
  return path.basename(name).replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "file";
}

class UploadError extends Error {
  status = 400;
}

/**
 * Validate and store a file (moved from a temp path). Returns the saved asset.
 * The stored file name is server-generated; the original name is kept only as metadata.
 */
export async function ingestFile(opts: {
  tempPath: string;
  originalName: string;
  projectId: string | null;
  role?: string;
  license?: string;
}): Promise<MediaAsset> {
  const ext = path.extname(opts.originalName).toLowerCase();
  const t = TYPES[ext];
  try {
    if (!t) throw new UploadError(`File type ${ext || "(none)"} is not allowed`);
    const stat = fs.statSync(opts.tempPath);
    if (stat.size === 0) throw new UploadError("File is empty");
    if (stat.size > t.maxMb * 1024 * 1024) throw new UploadError(`File exceeds ${t.maxMb} MB limit for ${ext}`);
    const fd = fs.openSync(opts.tempPath, "r");
    const head = Buffer.alloc(16);
    fs.readSync(fd, head, 0, 16, 0);
    fs.closeSync(fd);
    if (!t.magic(head)) throw new UploadError("File content does not match its extension");

    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const fileName = `${id}${ext}`;
    const dst = path.join(MEDIA_DIR, fileName);
    fs.renameSync(opts.tempPath, dst);

    let meta: Awaited<ReturnType<typeof probe>> = {};
    try {
      meta = await probe(dst);
    } catch {
      fs.rmSync(dst, { force: true });
      throw new UploadError("File could not be decoded");
    }
    const role = (ROLES.includes(opts.role as MediaRole) ? opts.role : defaultRole(t.kind)) as MediaRole;
    const asset: MediaAsset = {
      id,
      projectId: opts.projectId,
      kind: t.kind,
      role,
      originalName: sanitizeName(opts.originalName),
      fileName,
      mimeType: t.mime,
      size: stat.size,
      width: meta.width,
      height: meta.height,
      duration: t.kind === "image" ? undefined : meta.duration,
      license: opts.license?.slice(0, 200),
      createdAt: new Date().toISOString(),
    };
    return Media.save(asset);
  } finally {
    if (fs.existsSync(opts.tempPath)) fs.rmSync(opts.tempPath, { force: true });
  }
}

function defaultRole(kind: MediaKind): MediaRole {
  return kind === "image" ? "product-image" : kind === "video" ? "product-video" : "music";
}

export function deleteMedia(id: string) {
  const m = Media.get(id);
  if (!m) return false;
  fs.rmSync(mediaFilePath(m), { force: true });
  Media.remove(id);
  return true;
}
