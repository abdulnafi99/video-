import React from "react";
import { Icon } from "../components/Icon";
import { ProjectCard } from "../components/ProjectCard";
import { Empty, Page, PageHead, useLoad, useToast } from "../components/ui";
import { go } from "../router";
import { api } from "../services/api";

export const Projects: React.FC = () => {
  const { data, reload } = useLoad(api.projects);
  const toast = useToast();
  const del = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" and all its renders? This cannot be undone.`)) return;
    try {
      await api.deleteProject(id);
      toast("Project deleted");
      reload();
    } catch (e) {
      toast((e as Error).message, true);
    }
  };
  const dup = async (id: string) => {
    const p = await api.duplicateProject(id);
    toast(`Duplicated as "${p.name}"`);
    reload();
  };
  return (
    <Page>
      <PageHead eyebrow="Library" title="My Projects" subtitle="Every project, storyboard and render, saved and preserved across restarts."
        actions={<button className="btn btn-primary" onClick={() => go("create")}><Icon name="plus" /> New project</button>} />
      {data && data.length === 0 ? (
        <div className="panel"><Empty title="No projects yet" icon={<Icon name="projects" size={34} />}><button className="btn btn-primary" onClick={() => go("create")}>Create video</button></Empty></div>
      ) : (
        <div className="grid grid-3">
          {data?.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} actions={
              <span className="row" style={{ gap: 4 }}>
                <button className="btn btn-ghost btn-sm icon-btn" title="Duplicate" onClick={() => dup(p.id)}><Icon name="copy" size={15} /></button>
                <button className="btn btn-ghost btn-sm icon-btn btn-danger" title="Delete" onClick={() => del(p.id, p.name)}><Icon name="trash" size={15} /></button>
              </span>
            } />
          ))}
        </div>
      )}
    </Page>
  );
};
