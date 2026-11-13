import React from "react";
import { motion } from "framer-motion";
import type { Project } from "../../shared/types";
import { go } from "../router";
import { fmtDate } from "../services/api";
import { StatusBadge } from "./ui";

export const ProjectCard: React.FC<{ project: Project; index?: number; actions?: React.ReactNode }> = ({ project, index = 0, actions }) => (
  <motion.div
    className="panel project-card"
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    onClick={() => go(`editor/${project.id}`)}
  >
    <div className="thumb">
      {project.thumbnail ? <img src={project.thumbnail} alt="" /> : <div className="thumb-ph">{project.brandName || project.name}</div>}
      <span className="badge plain fmt">{project.format} · {project.duration}s</span>
    </div>
    <div style={{ padding: "14px 16px 16px" }}>
      <div className="row-between">
        <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.name}</div>
        <StatusBadge status={project.status} />
      </div>
      <div className="row-between" style={{ marginTop: 8 }}>
        <span className="dim small">{project.scenes.length} scenes · {fmtDate(project.updatedAt)}</span>
        <span onClick={(e) => e.stopPropagation()}>{actions}</span>
      </div>
    </div>
  </motion.div>
);

/** Inline project selector for project-scoped tools (Brand Kit, Audio Studio). */
export const ProjectPicker: React.FC<{ projects: Project[]; value?: string; onPick: (id: string) => void }> = ({ projects, value, onPick }) => (
  <select className="select" style={{ width: 300 }} value={value ?? ""} onChange={(e) => onPick(e.target.value)}>
    <option value="" disabled>Select a project…</option>
    {projects.map((p) => (
      <option key={p.id} value={p.id}>{p.name}</option>
    ))}
  </select>
);
