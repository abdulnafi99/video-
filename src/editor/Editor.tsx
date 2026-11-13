import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import type { AspectFormat, MainCompositionProps, Project, RenderJob, Scene } from "../../shared/types";
import { FORMAT_DIMENSIONS, TRANSITIONS } from "../../shared/types";
import { MainComposition } from "../../remotion/compositions/MainComposition";
import { computeTimeline, manifestTotalFrames } from "../../remotion/utils/timing";
import { Icon } from "../components/Icon";
import { Empty, Page, Progress, StatusBadge, useLoad, useToast } from "../components/ui";
import { go } from "../router";
import { api, mediaUrl, subscribeJobs } from "../services/api";
import { StoryboardEditor } from "./StoryboardEditor";
import { ScenePreview, useFit } from "./ScenePreview";

type View = "scene" | "full";

export const Editor: React.FC<{ projectId?: string }> = ({ projectId }) => {
  const toast = useToast();
  const templates = useLoad(api.templates);
  const [project, setProject] = useState<Project | null>(null);
  const [media, setMedia] = useState<Awaited<ReturnType<typeof api.media>>>([]);
  const [sel, setSel] = useState(0);
  const [view, setView] = useState<View>("scene");
  const [mode, setMode] = useState<"editor" | "storyboard">("editor");
  const [playing, setPlaying] = useState(true);
  const [restart, setRestart] = useState(0);
  const [saving, setSaving] = useState<"idle" | "pending" | "saved">("idle");
  const [version, setVersion] = useState(0);
  const [preview, setPreview] = useState<{ props: MainCompositionProps; renderedScenes: number } | null>(null);
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [quality, setQuality] = useState<"draft" | "standard" | "high">("standard");
  const [fps, setFps] = useState<30 | 60>(30);
  const [sceneTime, setSceneTime] = useState(0);
  const [frame, setFrame] = useState(0);
  const player = useRef<PlayerRef>(null);
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!projectId) return;
    api.project(projectId).then((p) => {
      setProject(p);
      setFps(p.fps);
    }).catch((e) => toast(e.message, true));
    api.media(projectId).then(setMedia);
    api.jobs().then((j) => setJobs(j.filter((x) => x.projectId === projectId)));
  }, [projectId, toast]);

  const loadPreview = useCallback(() => {
    if (projectId) api.previewProps(projectId).then(setPreview).catch(() => {});
  }, [projectId]);
  useEffect(loadPreview, [loadPreview, version]);

  useEffect(() => subscribeJobs((j) => {
    if (j.projectId !== projectId) return;
    setJobs((list) => [j, ...list.filter((x) => x.id !== j.id)]);
    if (j.status === "completed") {
      loadPreview();
      if (j.kind === "full") toast("Final video rendered and verified, so it's ready in Export History");
    }
    if (j.status === "failed") toast(`Render failed: ${j.error}`, true);
  }), [projectId, loadPreview, toast]);

  const persist = useCallback((next: Project, patch: Partial<Project>) => {
    setProject(next);
    setSaving("pending");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        const saved = await api.updateProject(next.id, patch);
        setProject((cur) => (cur ? { ...cur, status: saved.status, updatedAt: saved.updatedAt } : saved));
        setSaving("saved");
        setVersion((v) => v + 1);
      } catch (e) {
        toast((e as Error).message, true);
      }
    }, 650);
  }, [toast]);

  if (!projectId) {
    return <Page><Empty title="Choose a project" icon={<Icon name="projects" size={34} />}><button className="btn btn-primary" onClick={() => go("projects")}>Open projects</button></Empty></Page>;
  }
  if (!project) return <Page><div className="muted">Loading project…</div></Page>;

  const { width, height } = FORMAT_DIMENSIONS[project.format];
  const scene = project.scenes[Math.min(sel, project.scenes.length - 1)];
  const setScenes = (scenes: Scene[]) => persist({ ...project, scenes }, { scenes });
  const setScene = (patch: Partial<Scene>) => setScenes(project.scenes.map((s, i) => (i === sel ? { ...s, ...patch } : s)));
  const meta = templates.data?.find((t) => t.id === scene?.template);
  const activeJob = jobs.find((j) => j.status === "running" || j.status === "queued");
  const sceneJob = jobs.find((j) => j.kind === "scene-preview" && j.sceneId === scene?.id && (j.status === "running" || j.status === "queued"));
  const totalFrames = preview ? manifestTotalFrames(preview.props.manifest) : 1;
  const timeline = preview ? computeTimeline(preview.props.manifest.scenes, preview.props.manifest.fps) : null;
  const total = preview ? totalFrames / preview.props.manifest.fps : 0;

  const startRender = async () => {
    try {
      await api.render(project.id, { fps, quality });
      toast("Render queued: HyperFrames scenes, then Remotion final");
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  return (
    <Page wide>
      <div className="row-between editor-head" style={{ marginBottom: 14 }}>
        <div className="row">
          <button className="btn btn-ghost btn-sm icon-btn" onClick={() => go("projects")}><Icon name="back" /></button>
          <div>
            <div className="eyebrow">{project.brandName}</div>
            <input className="input" style={{ background: "transparent", border: 0, padding: 0, fontFamily: "var(--display)", fontSize: 22, fontWeight: 600, width: 360 }}
              value={project.name} onChange={(e) => persist({ ...project, name: e.target.value }, { name: e.target.value })} />
          </div>
          <span className="dim small">{saving === "pending" ? "Saving…" : saving === "saved" ? "All changes saved" : ""}</span>
        </div>
        <div className="row">
          <div className="tabs">
            <button className={`tab ${mode === "editor" ? "on" : ""}`} onClick={() => setMode("editor")}>Preview editor</button>
            <button className={`tab ${mode === "storyboard" ? "on" : ""}`} onClick={() => setMode("storyboard")}>Storyboard</button>
          </div>
          <div className="tabs">
            {(Object.keys(FORMAT_DIMENSIONS) as AspectFormat[]).map((f) => (
              <button key={f} className={`tab ${project.format === f ? "on" : ""}`} onClick={() => persist({ ...project, format: f }, { format: f })}>{f}</button>
            ))}
          </div>
          <button className="btn icon-btn" title="Brand kit" onClick={() => go(`brand/${project.id}`)}><Icon name="brand" size={16} /></button>
          <button className="btn icon-btn" title="Audio studio" onClick={() => go(`audio/${project.id}`)}><Icon name="audio" size={16} /></button>
          <select className="select" style={{ width: 120, height: 38, padding: "0 30px 0 12px" }} value={quality} onChange={(e) => setQuality(e.target.value as typeof quality)}>
            <option value="draft">Draft</option><option value="standard">Standard</option><option value="high">High</option>
          </select>
          <select className="select" style={{ width: 92, height: 38, padding: "0 30px 0 12px" }} value={fps} onChange={(e) => setFps(Number(e.target.value) as 30 | 60)}>
            <option value={30}>30 fps</option><option value={60}>60 fps</option>
          </select>
          <button className="btn btn-primary" disabled={Boolean(activeJob)} onClick={startRender}><Icon name="render" size={16} /> Render video</button>
        </div>
      </div>

      {activeJob && (
        <div className="panel" style={{ padding: "12px 18px", marginBottom: 14 }}>
          <div className="row-between" style={{ marginBottom: 8 }}>
            <div className="row"><StatusBadge status={activeJob.status} /><span className="small">{activeJob.stage}</span>{activeJob.currentScene && <span className="dim small">· {activeJob.currentScene}</span>}</div>
            <div className="row"><span className="mono">{activeJob.progress.toFixed(1)}%</span><button className="btn btn-sm" onClick={() => api.cancelJob(activeJob.id)}>Cancel</button></div>
          </div>
          <Progress value={activeJob.progress} />
        </div>
      )}

      {mode === "storyboard" ? (
        <StoryboardEditor scenes={project.scenes} templates={templates.data ?? []} media={media} onChange={setScenes} />
      ) : !scene ? (
        <div className="panel"><Empty title="No scenes yet"><button className="btn btn-primary" onClick={async () => { const p = await api.generateStoryboard(project.id, false); setProject(p); setVersion((v) => v + 1); }}>Generate storyboard</button></Empty></div>
      ) : (
        <div className="editor">
          {/* scene list */}
          <div className="panel editor-col" style={{ padding: 10 }}>
            <div className="row-between" style={{ padding: "6px 8px 10px" }}><span className="eyebrow">Scenes</span><span className="dim small">{project.scenes.length}</span></div>
            {project.scenes.map((s, i) => (
              <div key={s.id} className={`scene-item ${i === sel ? "on" : ""}`} onClick={() => { setSel(i); setView("scene"); setRestart((r) => r + 1); }}>
                <span className="scene-num">{i + 1}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.headline.replace(/\|/g, " ") || "(no headline)"}</div>
                  <div className="dim small">{templates.data?.find((t) => t.id === s.template)?.label} · {s.duration}s</div>
                  <div className="dim small">→ {TRANSITIONS[s.transition].label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* preview */}
          <div className="stack" style={{ minHeight: 0, gap: 10 }}>
            <div className="row-between">
              <div className="tabs">
                <button className={`tab ${view === "scene" ? "on" : ""}`} onClick={() => setView("scene")}>Scene {sel + 1}: live HyperFrames</button>
                <button className={`tab ${view === "full" ? "on" : ""}`} onClick={() => setView("full")}>Full video: Remotion</button>
              </div>
              <div className="row">
                <button className="btn btn-sm icon-btn" title="Restart" onClick={() => { setRestart((r) => r + 1); player.current?.seekTo(0); }}><Icon name="restart" size={15} /></button>
                <button className="btn btn-sm icon-btn" title={playing ? "Pause" : "Play"} onClick={() => {
                  const next = !playing;
                  setPlaying(next);
                  if (view === "full") (next ? player.current?.play() : player.current?.pause());
                }}><Icon name={playing ? "pause" : "play"} size={15} /></button>
                <span className="mono dim">{view === "scene" ? `${sceneTime.toFixed(1)}s / ${scene.duration}s` : `${(frame / (preview?.props.manifest.fps ?? 30)).toFixed(1)}s / ${total.toFixed(1)}s`}</span>
              </div>
            </div>
            <div className="preview-stage" style={{ flex: 1 }}>
              {view === "scene" ? (
                <ScenePreview key={`${scene.id}-${version}-${project.format}`} src={`/api/projects/${project.id}/scenes/${scene.id}/preview/?v=${version}`} width={width} height={height} playing={playing} restartKey={restart} onTime={(t) => setSceneTime(t)} />
              ) : preview ? (
                <FullPlayer props={preview.props} totalFrames={totalFrames} playerRef={player} onFrame={setFrame} playing={playing} />
              ) : null}
            </div>
            {view === "full" && preview && preview.renderedScenes < project.scenes.length && (
              <div className="dim small" style={{ textAlign: "center" }}>{preview.renderedScenes}/{project.scenes.length} scenes have up-to-date renders. Unrendered scenes show a placeholder. Use “Render scene preview” or render the full video.</div>
            )}
          </div>

          {/* settings */}
          <div className="panel editor-col settings-col panel-pad stack" style={{ gap: 14 }}>
            <div className="row-between"><span className="eyebrow">Scene {sel + 1} settings</span>
              <button className="btn btn-sm" disabled={Boolean(sceneJob)} onClick={async () => { await api.renderScene(project.id, scene.id); toast(`Scene ${sel + 1} draft render queued`); }}>
                <Icon name="film" size={14} /> {sceneJob ? `${sceneJob.progress.toFixed(0)}%` : "Render scene preview"}
              </button>
            </div>
            <div className="field"><label>Template</label>
              <select className="select" value={scene.template} onChange={(e) => setScene({ template: e.target.value as Scene["template"], variant: undefined })}>
                {templates.data?.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select></div>
            {meta?.variants && (
              <div className="field"><label>Variant</label>
                <div className="tabs">{meta.variants.map((v) => <button key={v.id} className={`tab ${(scene.variant ?? meta.variants![0].id) === v.id ? "on" : ""}`} onClick={() => setScene({ variant: v.id })}>{v.label}</button>)}</div>
              </div>
            )}
            <div className="field"><label>Headline</label><textarea className="textarea" style={{ minHeight: 60 }} value={scene.headline} onChange={(e) => setScene({ headline: e.target.value })} /></div>
            <div className="field"><label>Supporting text</label><textarea className="textarea" style={{ minHeight: 60 }} value={scene.subline} onChange={(e) => setScene({ subline: e.target.value })} /></div>
            {meta?.usesBullets && (
              <div className="field"><label>{scene.template === "final-cta" ? "Button label" : "Points (one per line)"}</label>
                <textarea className="textarea" value={scene.bullets.join("\n")} onChange={(e) => setScene({ bullets: e.target.value.split("\n") })} /></div>
            )}
            <div className="field"><label>Duration: {scene.duration.toFixed(1)}s</label>
              <input type="range" min={1.5} max={15} step={0.1} value={scene.duration} onChange={(e) => setScene({ duration: Number(e.target.value) })} /></div>
            <div className="field"><label>Animation preset</label>
              <div className="tabs">{(["gentle", "cinematic", "dynamic"] as const).map((p) => <button key={p} className={`tab ${scene.animationPreset === p ? "on" : ""}`} onClick={() => setScene({ animationPreset: p })} style={{ textTransform: "capitalize" }}>{p}</button>)}</div></div>
            <div className="field"><label>Transition to next</label>
              <select className="select" value={scene.transition} onChange={(e) => setScene({ transition: e.target.value as Scene["transition"] })}>
                {Object.entries(TRANSITIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select></div>
            {meta?.usesMedia && (
              <div className="field"><label>Replace image / video</label>
                <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
                  {media.filter((m) => m.kind !== "audio").map((m) => (
                    <button key={m.id} title={m.originalName} onClick={() => setScene({ mediaIds: scene.mediaIds[0] === m.id ? [] : [m.id] })}
                      style={{ width: 62, height: 46, borderRadius: 8, cursor: "pointer", border: scene.mediaIds[0] === m.id ? "2px solid var(--accent)" : "1px solid var(--border)", background: `#0d0f14 url(${m.kind === "image" ? mediaUrl(m.id) : ""}) center/cover`, color: "var(--text-3)", fontSize: 10 }}>
                      {m.kind === "video" ? "VIDEO" : ""}
                    </button>
                  ))}
                  <button className="btn btn-sm" onClick={() => go("media")}>Media library</button>
                </div>
              </div>
            )}
            <div className="field"><label>Voice-over / subtitle line</label><textarea className="textarea" style={{ minHeight: 60 }} value={scene.voiceOver} onChange={(e) => setScene({ voiceOver: e.target.value })} /></div>
          </div>

          {/* timeline */}
          <div className="panel timeline">
            <div className="row-between" style={{ marginBottom: 10 }}>
              <span className="eyebrow">Timeline</span>
              <span className="dim small">{total.toFixed(2)}s final · {project.format} · {fps} fps{project.audio.music ? " · music" : ""}{project.audio.voiceOver ? " · voice-over" : ""}</span>
            </div>
            <div style={{ position: "relative" }}>
              <div className="tl-track">
                {project.scenes.map((s, i) => (
                  <div key={s.id} className={`tl-clip ${i === sel ? "on" : ""}`} style={{ flex: s.duration }} onClick={() => {
                    setSel(i);
                    if (view === "full" && timeline) player.current?.seekTo(timeline.entries[i]?.startFrame ?? 0);
                    else setRestart((r) => r + 1);
                  }}>
                    <div className="t">{i + 1}. {s.headline.replace(/\|/g, " ")}</div>
                    <div className="d">{s.duration}s · {TRANSITIONS[s.transition].label}</div>
                  </div>
                ))}
              </div>
              {(project.audio.music || project.audio.voiceOver) && <div className="tl-audio" title="Audio" />}
              {view === "full" && <div className="tl-head" style={{ left: `${(frame / Math.max(1, totalFrames)) * 100}%` }} />}
            </div>
          </div>
        </div>
      )}
    </Page>
  );
};

const FullPlayer: React.FC<{ props: MainCompositionProps; totalFrames: number; playerRef: React.RefObject<PlayerRef | null>; onFrame: (f: number) => void; playing: boolean }> = ({ props, totalFrames, playerRef, onFrame, playing }) => {
  const { width, height, fps } = props.manifest;
  const { ref, scale } = useFit(width, height, 36);
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const on = (e: { detail: { frame: number } }) => onFrame(e.detail.frame);
    p.addEventListener("frameupdate", on);
    return () => p.removeEventListener("frameupdate", on);
  });
  const inputProps = useMemo(() => props, [props]);
  return (
    <div ref={ref} style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
      <div className="preview-frame" style={{ width: width * scale, height: height * scale }}>
        <Player
          ref={playerRef}
          component={MainComposition}
          inputProps={inputProps}
          durationInFrames={Math.max(1, totalFrames)}
          compositionWidth={width}
          compositionHeight={height}
          fps={fps}
          style={{ width: width * scale, height: height * scale }}
          autoPlay={playing}
          loop
          acknowledgeRemotionLicense
        />
      </div>
    </div>
  );
};
