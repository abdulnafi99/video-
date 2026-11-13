import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { RenderJob } from "../../shared/types";
import { Icon } from "../components/Icon";
import { Empty, Page, PageHead, Progress, StatusBadge, useToast } from "../components/ui";
import { go } from "../router";
import { api, fmtDate, subscribeJobs } from "../services/api";

export const RenderQueue: React.FC = () => {
  const toast = useToast();
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    api.jobs().then(setJobs);
    return subscribeJobs((j) => setJobs((list) => (list.some((x) => x.id === j.id) ? list.map((x) => (x.id === j.id ? j : x)) : [j, ...list])));
  }, []);
  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast(msg);
    } catch (e) {
      toast((e as Error).message, true);
    }
  };
  return (
    <Page>
      <PageHead eyebrow="Background jobs" title="Render Queue" subtitle="Live status straight from the render processes. Nothing is marked complete until the output file passes verification." />
      {jobs.length === 0 ? <div className="panel"><Empty title="No render jobs yet" icon={<Icon name="queue" size={30} />} /></div> : (
        <div className="stack">
          <AnimatePresence initial={false}>
            {jobs.map((j) => (
              <motion.div key={j.id} layout className="panel" style={{ padding: "16px 20px" }} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="row-between">
                  <div className="row" style={{ minWidth: 0 }}>
                    <StatusBadge status={j.status} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{j.projectName ?? j.projectId} <span className="dim small">· {j.kind === "full" ? "Full video" : "Scene preview"} · {j.options.quality} · {j.options.fps} fps</span></div>
                      <div className="muted small">{j.stage}{j.currentScene ? ` · ${j.currentScene}` : ""} · {fmtDate(j.createdAt)}</div>
                    </div>
                  </div>
                  <div className="row">
                    <span className="mono" style={{ width: 54, textAlign: "right" }}>{j.progress.toFixed(1)}%</span>
                    {(j.status === "running" || j.status === "queued") && <button className="btn btn-sm" onClick={() => act(() => api.cancelJob(j.id), "Cancelling…")}>Cancel</button>}
                    {(j.status === "failed" || j.status === "cancelled") && <button className="btn btn-sm" onClick={() => act(() => api.retryJob(j.id), "Retry queued")}><Icon name="retry" size={14} /> Retry</button>}
                    {j.status === "completed" && j.kind === "full" && <a className="btn btn-sm btn-primary" href={`/api/exports/${j.id}/video`}><Icon name="download" size={14} /> Download</a>}
                    {j.status === "completed" && j.kind === "scene-preview" && <button className="btn btn-sm" onClick={() => go(`editor/${j.projectId}`)}>Open</button>}
                    <button className="btn btn-ghost btn-sm" onClick={() => setOpen(open === j.id ? null : j.id)}>Log</button>
                  </div>
                </div>
                {(j.status === "running" || j.status === "queued") && <div style={{ marginTop: 12 }}><Progress value={j.progress} /></div>}
                {j.error && <div className="small" style={{ color: "var(--danger)", marginTop: 10 }}>{j.error}</div>}
                {open === j.id && <div className="log mono" style={{ marginTop: 12 }}>{j.log.length ? j.log.join("\n") : "No log entries yet."}</div>}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </Page>
  );
};
