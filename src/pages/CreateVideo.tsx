import React, { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { AspectFormat, MediaAsset, MediaRole, Project, VisualStyle } from "../../shared/types";
import { FORMAT_DIMENSIONS, VISUAL_STYLES } from "../../shared/types";
import { Icon } from "../components/Icon";
import { Field, Page, PageHead, useLoad, useToast } from "../components/ui";
import { StoryboardEditor } from "../editor/StoryboardEditor";
import { go } from "../router";
import { api, mediaUrl } from "../services/api";

const STEPS = ["Project details", "Format", "Duration", "Visual style", "Media", "Storyboard"];
const UPLOAD_SLOTS: { role: MediaRole; label: string; accept: string; hint: string }[] = [
  { role: "logo", label: "Brand logo", accept: ".png,.webp,.jpg,.jpeg", hint: "Transparent PNG works best" },
  { role: "product-image", label: "Product images", accept: ".png,.jpg,.jpeg,.webp", hint: "Used by showcase scenes" },
  { role: "product-video", label: "Product videos", accept: ".mp4,.mov,.webm", hint: "Hero footage" },
  { role: "screenshot", label: "App screenshots", accept: ".png,.jpg,.jpeg,.webp", hint: "For UI demonstrations" },
  { role: "background", label: "Background footage", accept: ".mp4,.mov,.webm,.jpg,.png", hint: "Ambient backdrops" },
  { role: "voice-over", label: "Voice-over (optional)", accept: ".mp3,.wav,.m4a,.aac", hint: "Your recorded narration" },
];

export const CreateVideo: React.FC = () => {
  const toast = useToast();
  const templates = useLoad(api.templates);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "", brandName: "", productName: "", description: "", objective: "", audience: "",
    format: "9:16" as AspectFormat, duration: 30, custom: false, style: "premium-cinematic" as VisualStyle, language: "ms" as "ms" | "en", build3d: false,
  });
  const [uploads, setUploads] = useState<MediaAsset[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const set = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));

  const canNext = step !== 0 || (form.name.trim() && form.brandName.trim());

  const doUpload = async (files: FileList | null, role: MediaRole) => {
    if (!files?.length) return;
    try {
      const r = await api.upload([...files], { role });
      setUploads((u) => [...u, ...r.assets]);
      r.errors.forEach((e) => toast(e, true));
      if (r.assets.length) toast(`${r.assets.length} file(s) uploaded`);
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  const generate = async () => {
    setBusy(true);
    try {
      const logo = uploads.find((u) => u.role === "logo");
      const vo = uploads.find((u) => u.role === "voice-over");
      let p = await api.createProject({
        name: form.name, brandName: form.brandName, productName: form.productName || form.brandName, description: form.description, objective: form.objective,
        audience: form.audience, format: form.format, duration: form.duration, style: form.style, language: form.language,
        brand: { brandName: form.brandName, logoMediaId: logo?.id } as Project["brand"],
        audio: { sfx: [], subtitles: false, voiceOver: vo ? { mediaId: vo.id, volume: 1, fadeIn: 0.2, fadeOut: 0.5, startAt: 0.3 } : undefined },
        generateStoryboard: true, includeBuild3d: form.build3d,
      });
      // attach uploaded visuals to media-driven scenes
      const visuals = uploads.filter((u) => ["product-image", "product-video", "screenshot", "background"].includes(u.role));
      if (visuals.length) {
        p = await api.updateProject(p.id, {
          scenes: p.scenes.map((s) =>
            s.template === "product-showcase" || s.template === "floating-product" ? { ...s, mediaIds: visuals.filter((v) => v.role !== "screenshot").slice(0, 1).map((v) => v.id) }
              : s.template === "feature-showcase" ? { ...s, mediaIds: visuals.filter((v) => v.kind === "image").slice(1, 2).map((v) => v.id) }
                : s.template === "ui-demonstration" ? { ...s, mediaIds: visuals.filter((v) => v.role === "screenshot").slice(0, 1).map((v) => v.id) } : s),
        });
      }
      setProject(p);
      toast("Storyboard generated, so review and edit every scene below");
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  const saveStoryboard = async (open: boolean) => {
    if (!project) return;
    const p = await api.updateProject(project.id, { scenes: project.scenes });
    setProject(p);
    toast("Storyboard saved");
    if (open) go(`editor/${p.id}`);
  };

  return (
    <Page>
      <PageHead eyebrow="New production" title="Create Video" subtitle="Brief, format, style and media, turned into an editable cinematic storyboard." />
      <div className="steps">
        {STEPS.map((s, i) => (
          <div key={s} className={`step-pill ${i === step ? "on" : i < step ? "done" : ""}`} onClick={() => (i < step || project) && setStep(i)}>
            <span className="n">{i < step ? <Icon name="check" size={12} /> : i + 1}</span>{s}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
          {step === 0 && (
            <div className="panel panel-pad grid grid-2">
              <Field label="Project name *"><input className="input" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Spring launch film" /></Field>
              <Field label="Brand name *"><input className="input" value={form.brandName} onChange={(e) => set({ brandName: e.target.value })} placeholder="Your company" /></Field>
              <Field label="Product name"><input className="input" value={form.productName} onChange={(e) => set({ productName: e.target.value })} /></Field>
              <Field label="Language">
                <select className="select" value={form.language} onChange={(e) => set({ language: e.target.value as "ms" | "en" })}><option value="ms">Bahasa Melayu</option><option value="en">English</option></select>
              </Field>
              <div style={{ gridColumn: "1 / -1" }}><Field label="Video description" hint="Separate key benefits with commas; they become feature cards."><textarea className="textarea" value={form.description} onChange={(e) => set({ description: e.target.value })} /></Field></div>
              <Field label="Marketing objective"><input className="input" value={form.objective} onChange={(e) => set({ objective: e.target.value })} placeholder="Drive bookings for…" /></Field>
              <Field label="Target audience"><input className="input" value={form.audience} onChange={(e) => set({ audience: e.target.value })} /></Field>
            </div>
          )}
          {step === 1 && (
            <div className="grid grid-3">
              {(Object.keys(FORMAT_DIMENSIONS) as AspectFormat[]).map((f) => {
                const d = FORMAT_DIMENSIONS[f];
                const h = 80, w = (d.width / d.height) * h;
                return (
                  <button key={f} className={`choice ${form.format === f ? "on" : ""}`} onClick={() => set({ format: f })} style={{ padding: 26 }}>
                    <div className="format-shape" style={{ width: w, height: h, color: form.format === f ? "var(--accent)" : "var(--text-3)" }} />
                    <div className="choice-title">{d.label}</div>
                    <div className="choice-desc">{d.width} × {d.height}</div>
                  </button>
                );
              })}
            </div>
          )}
          {step === 2 && (
            <div className="panel panel-pad">
              <div className="chips">
                {[15, 30, 45, 60].map((s) => (
                  <button key={s} className={`choice ${!form.custom && form.duration === s ? "on" : ""}`} style={{ minWidth: 130 }} onClick={() => set({ duration: s, custom: false })}>
                    <div className="choice-title" style={{ fontFamily: "var(--display)", fontSize: 26 }}>{s}s</div>
                    <div className="choice-desc">{s <= 15 ? "Social teaser" : s <= 30 ? "Standard promo" : s <= 45 ? "Story-led" : "Full showcase"}</div>
                  </button>
                ))}
                <button className={`choice ${form.custom ? "on" : ""}`} style={{ minWidth: 130 }} onClick={() => set({ custom: true })}>
                  <div className="choice-title" style={{ fontFamily: "var(--display)", fontSize: 26 }}>Custom</div>
                  <div className="choice-desc">6–180 seconds</div>
                </button>
              </div>
              {form.custom && <div style={{ marginTop: 18, maxWidth: 240 }}><Field label="Duration (seconds)"><input className="input" type="number" min={6} max={180} value={form.duration} onChange={(e) => set({ duration: Number(e.target.value) })} /></Field></div>}
            </div>
          )}
          {step === 3 && (
            <>
              <div className="grid grid-3">
                {(Object.keys(VISUAL_STYLES) as VisualStyle[]).map((s) => (
                  <button key={s} className={`choice ${form.style === s ? "on" : ""}`} onClick={() => set({ style: s })} style={{ padding: 22 }}>
                    <div className="choice-title">{VISUAL_STYLES[s].label}</div>
                    <div className="choice-desc">{VISUAL_STYLES[s].description}</div>
                  </button>
                ))}
              </div>
              <label className="panel panel-pad row" style={{ marginTop: 16, cursor: "pointer" }}>
                <input type="checkbox" checked={form.build3d} onChange={(e) => set({ build3d: e.target.checked })} />
                <div><div style={{ fontWeight: 600 }}>Include 3D build sequence</div><div className="muted small">A Three.js construction scene, ideal for building, property and architecture brands.</div></div>
              </label>
            </>
          )}
          {step === 4 && (
            <div className="grid grid-3">
              {UPLOAD_SLOTS.map((slot) => <UploadSlot key={slot.role} slot={slot} assets={uploads.filter((u) => u.role === slot.role)} onFiles={(f) => doUpload(f, slot.role)} />)}
            </div>
          )}
          {step === 5 && (
            <div>
              {!project ? (
                <div className="panel panel-pad" style={{ textAlign: "center", padding: 50 }}>
                  <Icon name="sparkle" size={32} />
                  <h2 className="section" style={{ marginTop: 12 }}>Generate your storyboard</h2>
                  <p className="muted">Scene number, duration, visuals, on-screen text, camera, animation, transitions, audio and voice-over, all editable.</p>
                  <button className="btn btn-primary btn-lg" disabled={busy || !templates.data} onClick={generate}>{busy ? "Generating…" : "Generate storyboard"}</button>
                </div>
              ) : (
                <>
                  <StoryboardEditor scenes={project.scenes} templates={templates.data ?? []} media={uploads} onChange={(scenes) => setProject({ ...project, scenes })} />
                  <div className="row" style={{ justifyContent: "flex-end", marginTop: 18 }}>
                    <button className="btn" onClick={() => saveStoryboard(false)}>Save storyboard</button>
                    <button className="btn btn-primary" onClick={() => saveStoryboard(true)}>Save & open editor <Icon name="arrow" size={15} /></button>
                  </div>
                </>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {step < 5 && (
        <div className="row" style={{ justifyContent: "space-between", marginTop: 24 }}>
          <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><Icon name="back" size={15} /> Back</button>
          <button className="btn btn-primary" disabled={!canNext} onClick={() => setStep(step + 1)}>Continue <Icon name="arrow" size={15} /></button>
        </div>
      )}
    </Page>
  );
};

const UploadSlot: React.FC<{ slot: (typeof UPLOAD_SLOTS)[number]; assets: MediaAsset[]; onFiles: (f: FileList | null) => void }> = ({ slot, assets, onFiles }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div className="panel panel-pad">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <div><div style={{ fontWeight: 600 }}>{slot.label}</div><div className="dim small">{slot.hint}</div></div>
        <span className="badge plain">{assets.length}</span>
      </div>
      <div className={`dropzone ${over ? "over" : ""}`} style={{ padding: 22 }} onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(e.dataTransfer.files); }}>
        <Icon name="upload" /> <div className="small" style={{ marginTop: 6 }}>Drop or click to upload</div>
        <input ref={ref} type="file" hidden multiple accept={slot.accept} onChange={(e) => onFiles(e.target.files)} />
      </div>
      {assets.length > 0 && (
        <div className="row" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
          {assets.map((a) => a.kind === "image"
            ? <img key={a.id} src={mediaUrl(a.id)} alt="" style={{ height: 44, borderRadius: 8, background: "#0d0f14" }} />
            : <span key={a.id} className="badge plain">{a.originalName}</span>)}
        </div>
      )}
    </div>
  );
};
