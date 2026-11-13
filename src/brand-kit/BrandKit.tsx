import React, { useEffect, useState } from "react";
import type { BrandKit, Project } from "../../shared/types";
import { ProjectPicker } from "../components/ProjectCard";
import { Icon } from "../components/Icon";
import { Field, Page, PageHead, useLoad, useToast } from "../components/ui";
import { go } from "../router";
import { api, mediaUrl } from "../services/api";

export const BrandKitPage: React.FC<{ projectId?: string }> = ({ projectId }) => {
  const toast = useToast();
  const projects = useLoad(api.projects);
  const media = useLoad(() => api.media(projectId), [projectId]);
  const [project, setProject] = useState<Project | null>(null);
  const [brand, setBrand] = useState<BrandKit | null>(null);

  useEffect(() => {
    if (!projectId) return setProject(null);
    api.project(projectId).then((p) => { setProject(p); setBrand(p.brand); });
  }, [projectId]);

  const save = async () => {
    if (!project || !brand) return;
    const p = await api.updateProject(project.id, { brand });
    setProject(p);
    setBrand(p.brand);
    toast("Brand kit saved. Scene previews will update.");
  };
  const set = (patch: Partial<BrandKit>) => brand && setBrand({ ...brand, ...patch });
  const images = media.data?.filter((m) => m.kind === "image") ?? [];

  return (
    <Page>
      <PageHead eyebrow="Identity" title="Brand Kit" subtitle="Logo, colours, typography and contact details applied to every scene of a project."
        actions={<>
          <ProjectPicker projects={projects.data ?? []} value={projectId} onPick={(id) => go(`brand/${id}`)} />
          {project && <button className="btn" onClick={() => go(`editor/${project.id}`)}>Open editor</button>}
          {brand && <button className="btn btn-primary" onClick={save}><Icon name="check" size={15} /> Save</button>}
        </>} />
      {!brand ? (
        <div className="panel panel-pad muted">Select a project to edit its brand kit.</div>
      ) : (
        <div className="grid grid-2">
          <div className="panel panel-pad stack" style={{ gap: 16 }}>
            <h2 className="section">Brand</h2>
            <Field label="Brand name"><input className="input" value={brand.brandName} onChange={(e) => set({ brandName: e.target.value })} /></Field>
            <div className="grid grid-2">
              <Field label="Social handle"><input className="input" value={brand.handle ?? ""} onChange={(e) => set({ handle: e.target.value })} placeholder="TikTok @yourbrand" /></Field>
              <Field label="Website"><input className="input" value={brand.website ?? ""} onChange={(e) => set({ website: e.target.value })} /></Field>
            </div>
            <Field label="Location"><input className="input" value={brand.location ?? ""} onChange={(e) => set({ location: e.target.value })} /></Field>
            <div className="grid grid-2">
              <Field label="Heading font"><select className="select" value={brand.headingFont} onChange={(e) => set({ headingFont: e.target.value })}><option>Space Grotesk</option><option>Inter</option></select></Field>
              <Field label="Body font"><select className="select" value={brand.bodyFont} onChange={(e) => set({ bodyFont: e.target.value })}><option>Inter</option><option>Space Grotesk</option></select></Field>
            </div>
          </div>
          <div className="panel panel-pad stack" style={{ gap: 16 }}>
            <h2 className="section">Colours</h2>
            <div className="grid grid-2">
              {([["primaryColor", "Primary"], ["accentColor", "Accent"], ["backgroundColor", "Background"], ["textColor", "Text"]] as const).map(([k, label]) => (
                <div key={k} className="stack" style={{ gap: 8 }}>
                  <div className="swatch" style={{ background: brand[k] }} />
                  <div className="row"><input type="color" value={brand[k]} onChange={(e) => set({ [k]: e.target.value })} /><div><div className="small">{label}</div><div className="mono dim">{brand[k]}</div></div></div>
                </div>
              ))}
            </div>
          </div>
          <div className="panel panel-pad" style={{ gridColumn: "1 / -1" }}>
            <div className="row-between" style={{ marginBottom: 14 }}><h2 className="section">Logo</h2><button className="btn btn-sm" onClick={() => go("media")}><Icon name="upload" size={14} /> Upload in Media Library</button></div>
            <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
              {images.length === 0 && <span className="muted small">No images uploaded yet.</span>}
              {images.map((m) => (
                <button key={m.id} onClick={() => set({ logoMediaId: m.id })} className={`choice ${brand.logoMediaId === m.id ? "on" : ""}`} style={{ width: 180, padding: 10 }}>
                  <div className="media-thumb checker" style={{ borderRadius: 10 }}><img src={mediaUrl(m.id)} alt="" /></div>
                  <div className="small" style={{ marginTop: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.originalName}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Page>
  );
};
