import React, { useEffect, useRef, useState } from "react";
import type { AudioSettings, AudioTrackSettings, MediaAsset, Project } from "../../shared/types";
import { ProjectPicker } from "../components/ProjectCard";
import { Icon } from "../components/Icon";
import { Field, Page, PageHead, useLoad, useToast } from "../components/ui";
import { go } from "../router";
import { api, fmtDur, mediaUrl } from "../services/api";

export const AudioStudio: React.FC<{ projectId?: string }> = ({ projectId }) => {
  const toast = useToast();
  const projects = useLoad(api.projects);
  const [project, setProject] = useState<Project | null>(null);
  const [audio, setAudio] = useState<AudioSettings | null>(null);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [busy, setBusy] = useState("");
  const upRef = useRef<HTMLInputElement>(null);

  const loadMedia = () => projectId && api.media(projectId).then(setMedia);
  useEffect(() => {
    if (!projectId) return;
    api.project(projectId).then((p) => { setProject(p); setAudio(p.audio); });
    loadMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const audioMedia = media.filter((m) => m.kind === "audio");
  const save = async () => {
    if (!project || !audio) return;
    const p = await api.updateProject(project.id, { audio });
    setProject(p);
    setAudio(p.audio);
    toast("Audio settings saved");
  };
  const generate = async (kind: "ambient" | "whoosh") => {
    if (!project) return;
    setBusy(kind);
    try {
      const m = await api.generateAudio({ kind, seconds: project.duration + 2, projectId: project.id });
      await loadMedia();
      if (kind === "ambient") setAudio((a) => a && { ...a, music: { mediaId: m.id, volume: 0.8, fadeIn: 1, fadeOut: 2, startAt: 0 } });
      toast(kind === "ambient" ? "Original music bed generated and assigned" : "Whoosh SFX generated");
    } finally {
      setBusy("");
    }
  };
  const upload = async (files: FileList | null) => {
    if (!files?.length || !project) return;
    const r = await api.upload([...files], { projectId: project.id, role: "music", license: "User-provided. You confirm you hold the rights." });
    r.errors.forEach((e) => toast(e, true));
    loadMedia();
  };

  const Track: React.FC<{ k: "music" | "voiceOver"; label: string }> = ({ k, label }) => {
    const t = audio?.[k];
    const update = (patch: Partial<AudioTrackSettings>) => audio && setAudio({ ...audio, [k]: t ? { ...t, ...patch } : undefined });
    return (
      <div className="panel panel-pad stack" style={{ gap: 14 }}>
        <div className="row-between"><h2 className="section">{label}</h2>{t && <button className="btn btn-ghost btn-sm" onClick={() => audio && setAudio({ ...audio, [k]: undefined })}>Remove</button>}</div>
        <select className="select" value={t?.mediaId ?? ""} onChange={(e) => audio && setAudio({ ...audio, [k]: e.target.value ? { volume: k === "music" ? 0.8 : 1, fadeIn: k === "music" ? 1 : 0.2, fadeOut: k === "music" ? 2 : 0.4, startAt: 0, ...(t ?? {}), mediaId: e.target.value } : undefined })}>
          <option value="">None</option>
          {audioMedia.map((m) => <option key={m.id} value={m.id}>{m.originalName}{m.duration ? ` (${fmtDur(m.duration)})` : ""}</option>)}
        </select>
        {t && (
          <>
            <audio src={mediaUrl(t.mediaId)} controls style={{ width: "100%" }} />
            <div className="grid grid-2">
              <Field label={`Volume: ${Math.round(t.volume * 100)}%`}><input type="range" min={0} max={1} step={0.01} value={t.volume} onChange={(e) => update({ volume: Number(e.target.value) })} /></Field>
              <Field label={`Starts at: ${t.startAt.toFixed(1)}s`}><input type="range" min={0} max={Math.max(5, project?.duration ?? 30)} step={0.1} value={t.startAt} onChange={(e) => update({ startAt: Number(e.target.value) })} /></Field>
              <Field label={`Fade in: ${t.fadeIn.toFixed(1)}s`}><input type="range" min={0} max={5} step={0.1} value={t.fadeIn} onChange={(e) => update({ fadeIn: Number(e.target.value) })} /></Field>
              <Field label={`Fade out: ${t.fadeOut.toFixed(1)}s`}><input type="range" min={0} max={6} step={0.1} value={t.fadeOut} onChange={(e) => update({ fadeOut: Number(e.target.value) })} /></Field>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <Page>
      <PageHead eyebrow="Sound" title="Audio Studio" subtitle="Music, voice-over, sound effects and subtitles, mixed frame-accurately by Remotion."
        actions={<>
          <ProjectPicker projects={projects.data ?? []} value={projectId} onPick={(id) => go(`audio/${id}`)} />
          {project && <button className="btn" onClick={() => go(`editor/${project.id}`)}>Open editor</button>}
          {audio && <button className="btn btn-primary" onClick={save}><Icon name="check" size={15} /> Save</button>}
        </>} />
      {!audio || !project ? <div className="panel panel-pad muted">Select a project to manage its audio.</div> : (
        <div className="stack" style={{ gap: 18 }}>
          <div className="panel panel-pad row-between">
            <div><div style={{ fontWeight: 600 }}>Licensing</div><div className="muted small">Use only music you own or have licensed. The generator below creates original, royalty-free beds and effects; it never reproduces existing songs.</div></div>
            <div className="row">
              <button className="btn" disabled={Boolean(busy)} onClick={() => generate("ambient")}><Icon name="sparkle" size={15} /> {busy === "ambient" ? "Composing…" : "Generate original music bed"}</button>
              <button className="btn" disabled={Boolean(busy)} onClick={() => generate("whoosh")}>{busy === "whoosh" ? "…" : "Generate whoosh SFX"}</button>
              <button className="btn" onClick={() => upRef.current?.click()}><Icon name="upload" size={15} /> Upload audio</button>
              <input ref={upRef} type="file" hidden accept=".mp3,.wav,.m4a,.aac" multiple onChange={(e) => upload(e.target.files)} />
            </div>
          </div>
          <div className="grid grid-2">
            <Track k="music" label="Background music" />
            <Track k="voiceOver" label="Voice-over" />
          </div>
          <div className="panel panel-pad stack">
            <div className="row-between"><h2 className="section">Sound effects</h2>
              <button className="btn btn-sm" disabled={!audioMedia.length} onClick={() => setAudio({ ...audio, sfx: [...audio.sfx, { id: Math.random().toString(36).slice(2, 10), mediaId: (audioMedia.find((m) => m.role === "sfx") ?? audioMedia[0]).id, at: 0, volume: 0.6 }] })}><Icon name="plus" size={14} /> Place effect</button></div>
            {audio.sfx.length === 0 && <span className="muted small">No effects placed.</span>}
            {audio.sfx.map((s, i) => (
              <div key={s.id} className="row" style={{ gap: 14 }}>
                <select className="select" style={{ width: 280 }} value={s.mediaId} onChange={(e) => setAudio({ ...audio, sfx: audio.sfx.map((x, j) => (j === i ? { ...x, mediaId: e.target.value } : x)) })}>
                  {audioMedia.map((m) => <option key={m.id} value={m.id}>{m.originalName}</option>)}
                </select>
                <div style={{ flex: 1 }}><Field label={`At ${s.at.toFixed(2)}s`}><input type="range" min={0} max={project.duration + 5} step={0.05} value={s.at} onChange={(e) => setAudio({ ...audio, sfx: audio.sfx.map((x, j) => (j === i ? { ...x, at: Number(e.target.value) } : x)) })} /></Field></div>
                <div style={{ width: 160 }}><Field label={`Volume ${Math.round(s.volume * 100)}%`}><input type="range" min={0} max={1} step={0.01} value={s.volume} onChange={(e) => setAudio({ ...audio, sfx: audio.sfx.map((x, j) => (j === i ? { ...x, volume: Number(e.target.value) } : x)) })} /></Field></div>
                <button className="btn btn-ghost btn-sm icon-btn btn-danger" onClick={() => setAudio({ ...audio, sfx: audio.sfx.filter((_, j) => j !== i) })}><Icon name="trash" size={15} /></button>
              </div>
            ))}
          </div>
          <label className="panel panel-pad row" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={audio.subtitles} onChange={(e) => setAudio({ ...audio, subtitles: e.target.checked })} />
            <div><div style={{ fontWeight: 600 }}>Burn in subtitles</div><div className="muted small">Generated from each scene's voice-over script and timed to the scene timeline. An .srt file is exported with every render either way.</div></div>
          </label>
        </div>
      )}
    </Page>
  );
};
