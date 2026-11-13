import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { DATA_DIR } from "../services/paths";
import type { ExportRecord, MediaAsset, Project, RenderJob } from "../../shared/types";

/**
 * Persistent metadata in SQLite (node:sqlite, no native build step).
 * Records are stored as JSON documents with a few indexed columns; files
 * live on disk under DATA_DIR. Everything survives a server restart.
 */
const db = new DatabaseSync(path.join(DATA_DIR, "cinemotion.db"));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, doc TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, project_id TEXT, doc TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, status TEXT NOT NULL, doc TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS exports (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, doc TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);

const parse = <T>(rows: unknown[]): T[] => rows.map((r) => JSON.parse((r as { doc: string }).doc) as T);

export const Projects = {
  list: () => parse<Project>(db.prepare("SELECT doc FROM projects ORDER BY updated_at DESC").all()),
  get: (id: string) => {
    const r = db.prepare("SELECT doc FROM projects WHERE id = ?").get(id) as { doc: string } | undefined;
    return r ? (JSON.parse(r.doc) as Project) : undefined;
  },
  save: (p: Project) => {
    db.prepare("INSERT INTO projects (id, doc, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET doc = excluded.doc, updated_at = excluded.updated_at").run(
      p.id, JSON.stringify(p), p.updatedAt,
    );
    return p;
  },
  remove: (id: string) => db.prepare("DELETE FROM projects WHERE id = ?").run(id),
};

export const Media = {
  list: (projectId?: string) =>
    projectId
      ? parse<MediaAsset>(db.prepare("SELECT doc FROM media WHERE project_id = ? OR project_id IS NULL ORDER BY created_at DESC").all(projectId))
      : parse<MediaAsset>(db.prepare("SELECT doc FROM media ORDER BY created_at DESC").all()),
  get: (id: string) => {
    const r = db.prepare("SELECT doc FROM media WHERE id = ?").get(id) as { doc: string } | undefined;
    return r ? (JSON.parse(r.doc) as MediaAsset) : undefined;
  },
  save: (m: MediaAsset) => {
    db.prepare("INSERT INTO media (id, project_id, doc, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET doc = excluded.doc, project_id = excluded.project_id").run(
      m.id, m.projectId, JSON.stringify(m), m.createdAt,
    );
    return m;
  },
  remove: (id: string) => db.prepare("DELETE FROM media WHERE id = ?").run(id),
};

export const Jobs = {
  list: (limit = 100) => parse<RenderJob>(db.prepare("SELECT doc FROM jobs ORDER BY created_at DESC LIMIT ?").all(limit)),
  byStatus: (status: string) => parse<RenderJob>(db.prepare("SELECT doc FROM jobs WHERE status = ? ORDER BY created_at ASC").all(status)),
  get: (id: string) => {
    const r = db.prepare("SELECT doc FROM jobs WHERE id = ?").get(id) as { doc: string } | undefined;
    return r ? (JSON.parse(r.doc) as RenderJob) : undefined;
  },
  save: (j: RenderJob) => {
    db.prepare("INSERT INTO jobs (id, project_id, status, doc, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET doc = excluded.doc, status = excluded.status").run(
      j.id, j.projectId, j.status, JSON.stringify(j), j.createdAt,
    );
    return j;
  },
};

export const Exports = {
  list: () => parse<ExportRecord>(db.prepare("SELECT doc FROM exports ORDER BY created_at DESC").all()),
  get: (id: string) => {
    const r = db.prepare("SELECT doc FROM exports WHERE id = ?").get(id) as { doc: string } | undefined;
    return r ? (JSON.parse(r.doc) as ExportRecord) : undefined;
  },
  save: (e: ExportRecord) => {
    db.prepare("INSERT INTO exports (id, project_id, doc, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET doc = excluded.doc").run(
      e.id, e.projectId, JSON.stringify(e), e.createdAt,
    );
    return e;
  },
};

export const Settings = {
  all: () => Object.fromEntries((db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[]).map((r) => [r.key, JSON.parse(r.value)])),
  set: (key: string, value: unknown) =>
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, JSON.stringify(value)),
};
