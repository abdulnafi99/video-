import React from "react";
import { motion } from "framer-motion";
import { Icon } from "../components/Icon";
import { ProjectCard } from "../components/ProjectCard";
import { Empty, Page, useLoad } from "../components/ui";
import { go } from "../router";
import { api } from "../services/api";

export const Overview: React.FC = () => {
  const stats = useLoad(api.stats);
  const templates = useLoad(api.templates);
  const s = stats.data;
  const cards = [
    { label: "Total projects", value: s?.totalProjects, icon: "projects" },
    { label: "Completed videos", value: s?.completedVideos, icon: "film" },
    { label: "Rendering jobs", value: s?.renderingJobs, icon: "queue" },
    { label: "Scene templates", value: templates.data?.length, icon: "scenes" },
  ];
  return (
    <Page>
      <motion.div className="panel hero" initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
        <div className="eyebrow">Cinemotion Studio</div>
        <h1><span className="shine">Create. Animate. Inspire.</span></h1>
        <p className="subtitle">Cinematic HyperFrames scenes, composed and mastered in Remotion. From brief to verified MP4 in one production suite.</p>
        <div className="row" style={{ marginTop: 22 }}>
          <button className="btn btn-primary btn-lg" onClick={() => go("create")}><Icon name="sparkle" /> Quick create</button>
          <button className="btn btn-lg" onClick={() => go("scenes")}>Browse scenes</button>
        </div>
      </motion.div>

      <div className="grid grid-4" style={{ marginTop: 18 }}>
        {cards.map((c, i) => (
          <motion.div key={c.label} className="panel stat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}>
            <div className="stat-icon"><Icon name={c.icon} /></div>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value">{c.value ?? "–"}</div>
          </motion.div>
        ))}
      </div>

      <div className="row-between" style={{ margin: "40px 0 16px" }}>
        <h2 className="section">Recent projects</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => go("projects")}>View all <Icon name="arrow" size={14} /></button>
      </div>
      {s && s.recentProjects.length === 0 ? (
        <div className="panel">
          <Empty title="No projects yet" icon={<Icon name="film" size={34} />}>
            <p>Create your first promotional video in a few steps.</p>
            <button className="btn btn-primary" onClick={() => go("create")}>Create video</button>
          </Empty>
        </div>
      ) : (
        <div className="grid grid-3">{s?.recentProjects.map((p, i) => <ProjectCard key={p.id} project={p} index={i} />)}</div>
      )}

      <div className="row-between" style={{ margin: "40px 0 16px" }}>
        <h2 className="section">Video templates</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => go("scenes")}>Scene library <Icon name="arrow" size={14} /></button>
      </div>
      <div className="grid grid-4">
        {templates.data?.slice(0, 8).map((t, i) => (
          <motion.div key={t.id} className="panel panel-pad" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <div className="row" style={{ marginBottom: 10 }}><span className="stat-icon" style={{ position: "static" }}><Icon name="scenes" /></span></div>
            <div style={{ fontWeight: 600 }}>{t.label}</div>
            <div className="muted small" style={{ marginTop: 4 }}>{t.description}</div>
          </motion.div>
        ))}
      </div>
    </Page>
  );
};
