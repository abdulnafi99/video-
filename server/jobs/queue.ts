import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { JobKind, RenderJob, RenderOptions } from "../../shared/types";
import { Jobs, Projects } from "../storage/db";
import { TMP_DIR } from "../services/paths";
import { CancelledError } from "./processes";
import { runFullRender } from "./pipeline";

/**
 * Background render queue. Jobs are persisted in SQLite and processed one at
 * a time outside the request cycle, so API calls never block on rendering.
 * Progress values come only from the render subprocesses themselves.
 */
const controllers = new Map<string, AbortController>();
let running = false;
const listeners = new Set<(j: RenderJob) => void>();

export function onJobUpdate(fn: (j: RenderJob) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function persist(job: RenderJob) {
  Jobs.save(job);
  for (const l of listeners) l(job);
}

/** On boot: jobs that were running when the server stopped cannot be resumed honestly. */
export function recoverJobs() {
  for (const j of Jobs.byStatus("running")) {
    persist({ ...j, status: "failed", error: "Server restarted while this job was running. Retry to render again.", finishedAt: new Date().toISOString() });
  }
  // clean stale temp files
  for (const f of fs.readdirSync(TMP_DIR)) fs.rmSync(path.join(TMP_DIR, f), { force: true, recursive: true });
  void tick();
}

export function enqueue(projectId: string, kind: JobKind, options: Partial<RenderOptions>, sceneId?: string): RenderJob {
  const project = Projects.get(projectId);
  const job: RenderJob = {
    id: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
    projectId,
    projectName: project?.name,
    kind,
    sceneId,
    status: "queued",
    progress: 0,
    stage: "Queued",
    log: [],
    options: { fps: options.fps === 60 ? 60 : 30, quality: options.quality === "draft" || options.quality === "high" ? options.quality : "standard" },
    createdAt: new Date().toISOString(),
  };
  persist(job);
  if (project && kind === "full") Projects.save({ ...project, status: "rendering", updatedAt: new Date().toISOString() });
  void tick();
  return job;
}

export function cancel(jobId: string) {
  const job = Jobs.get(jobId);
  if (!job) return undefined;
  if (job.status === "queued") {
    const j = { ...job, status: "cancelled" as const, stage: "Cancelled", finishedAt: new Date().toISOString() };
    persist(j);
    return j;
  }
  controllers.get(jobId)?.abort();
  return job;
}

export function retry(jobId: string) {
  const job = Jobs.get(jobId);
  if (!job || !["failed", "cancelled"].includes(job.status)) return undefined;
  return enqueue(job.projectId, job.kind, job.options, job.sceneId);
}

async function tick() {
  if (running) return;
  const next = Jobs.byStatus("queued")[0];
  if (!next) return;
  running = true;
  const ac = new AbortController();
  controllers.set(next.id, ac);
  let job: RenderJob = { ...next, status: "running", startedAt: new Date().toISOString(), stage: "Starting" };
  persist(job);
  let lastWrite = 0;
  const update = (patch: Partial<RenderJob>) => {
    job = { ...job, ...patch, progress: Math.max(job.progress, patch.progress ?? job.progress) };
    const now = Date.now();
    if (now - lastWrite > 400 || patch.stage) {
      lastWrite = now;
      persist(job);
    }
  };
  const log = (msg: string) => {
    job = { ...job, log: [...job.log, `${new Date().toISOString().slice(11, 19)} ${msg}`].slice(-200) };
    persist(job);
  };
  try {
    await runFullRender({ job, signal: ac.signal, update, log });
    job = { ...job, status: "completed", progress: 100, finishedAt: new Date().toISOString() };
    persist(job);
  } catch (e) {
    const cancelled = e instanceof CancelledError || ac.signal.aborted;
    job = {
      ...job,
      status: cancelled ? "cancelled" : "failed",
      stage: cancelled ? "Cancelled" : "Failed",
      error: cancelled ? undefined : e instanceof Error ? e.message : String(e),
      finishedAt: new Date().toISOString(),
    };
    persist(job);
    const p = Projects.get(job.projectId);
    if (p && job.kind === "full" && p.status === "rendering") Projects.save({ ...p, status: cancelled ? "storyboard" : "failed", updatedAt: new Date().toISOString() });
  } finally {
    controllers.delete(next.id);
    running = false;
    setImmediate(() => void tick());
  }
}
