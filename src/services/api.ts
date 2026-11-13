import type { ExportRecord, MainCompositionProps, MediaAsset, Project, RenderJob } from "../../shared/types";
import type { TemplateMeta } from "../../hyperframes/templates";

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body instanceof FormData ? init?.headers : { "Content-Type": "application/json", ...init?.headers },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new Error((data && (data.error || data.errors?.join(", "))) || `Request failed (${res.status})`);
  return data as T;
}

export interface Stats {
  totalProjects: number;
  completedVideos: number;
  renderingJobs: number;
  failedJobs: number;
  recentProjects: Project[];
}

export const api = {
  stats: () => req<Stats>("/api/stats"),
  projects: () => req<Project[]>("/api/projects"),
  project: (id: string) => req<Project>(`/api/projects/${id}`),
  createProject: (body: Partial<Project> & { generateStoryboard?: boolean; includeBuild3d?: boolean }) =>
    req<Project>("/api/projects", { method: "POST", body: JSON.stringify(body) }),
  updateProject: (id: string, patch: Partial<Project>) => req<Project>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteProject: (id: string) => req<{ ok: boolean }>(`/api/projects/${id}`, { method: "DELETE" }),
  duplicateProject: (id: string) => req<Project>(`/api/projects/${id}/duplicate`, { method: "POST" }),
  generateStoryboard: (id: string, includeBuild3d: boolean) =>
    req<Project>(`/api/projects/${id}/storyboard`, { method: "POST", body: JSON.stringify({ includeBuild3d }) }),
  previewProps: (id: string) => req<{ props: MainCompositionProps; renderedScenes: number }>(`/api/projects/${id}/preview-props`),
  generateVoiceOver: (id: string) => req<{ project: Project; asset: MediaAsset; placed: { sceneId: string; start: number; end: number; overrun: number }[] }>(`/api/projects/${id}/voiceover`, { method: "POST", body: "{}" }),
  render: (id: string, opts: { fps: number; quality: string }) => req<RenderJob>(`/api/projects/${id}/render`, { method: "POST", body: JSON.stringify(opts) }),
  renderScene: (id: string, sceneId: string) => req<RenderJob>(`/api/projects/${id}/scenes/${sceneId}/render`, { method: "POST", body: "{}" }),
  templates: () => req<TemplateMeta[]>("/api/templates"),
  media: (projectId?: string) => req<MediaAsset[]>(`/api/media${projectId ? `?projectId=${projectId}` : ""}`),
  upload: (files: File[], opts: { projectId?: string; role?: string; license?: string }) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    if (opts.projectId) fd.append("projectId", opts.projectId);
    if (opts.role) fd.append("role", opts.role);
    if (opts.license) fd.append("license", opts.license);
    return req<{ assets: MediaAsset[]; errors: string[] }>("/api/media", { method: "POST", body: fd });
  },
  updateMedia: (id: string, patch: Partial<MediaAsset>) => req<MediaAsset>(`/api/media/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteMedia: (id: string) => req<{ ok: boolean }>(`/api/media/${id}`, { method: "DELETE" }),
  generateAudio: (body: { kind: "ambient" | "whoosh"; seconds?: number; projectId?: string }) =>
    req<MediaAsset>("/api/audio/generate", { method: "POST", body: JSON.stringify(body) }),
  jobs: () => req<RenderJob[]>("/api/jobs"),
  cancelJob: (id: string) => req<RenderJob>(`/api/jobs/${id}/cancel`, { method: "POST" }),
  retryJob: (id: string) => req<RenderJob>(`/api/jobs/${id}/retry`, { method: "POST" }),
  exports: () => req<ExportRecord[]>("/api/exports"),
  settings: () => req<Record<string, unknown>>("/api/settings"),
  saveSettings: (s: Record<string, unknown>) => req<Record<string, unknown>>("/api/settings", { method: "PUT", body: JSON.stringify(s) }),
};

export const mediaUrl = (id: string) => `/api/media/${id}/file`;
export const fmtBytes = (n: number) => (n > 1e9 ? `${(n / 1e9).toFixed(2)} GB` : n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
export const fmtDate = (s: string) => new Date(s).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
export const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/** Live job updates over Server-Sent Events. */
export function subscribeJobs(onJob: (j: RenderJob) => void) {
  const es = new EventSource("/api/jobs/stream");
  es.onmessage = (e) => onJob(JSON.parse(e.data));
  return () => es.close();
}
