import React from "react";
import type { MediaAsset, Scene } from "../../shared/types";
import { TRANSITIONS } from "../../shared/types";
import type { TemplateMeta } from "../../hyperframes/templates";
import { Icon } from "../components/Icon";
import { mediaUrl } from "../services/api";

/** Full storyboard: every field of every scene is editable before rendering. */
export const StoryboardEditor: React.FC<{
  scenes: Scene[];
  templates: TemplateMeta[];
  media: MediaAsset[];
  onChange: (scenes: Scene[]) => void;
}> = ({ scenes, templates, media, onChange }) => {
  const set = (i: number, patch: Partial<Scene>) => onChange(scenes.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, d: number) => {
    const n = [...scenes];
    const [x] = n.splice(i, 1);
    n.splice(i + d, 0, x);
    onChange(n.map((s, k) => ({ ...s, order: k })));
  };
  const remove = (i: number) => onChange(scenes.filter((_, j) => j !== i).map((s, k) => ({ ...s, order: k })));
  const add = () =>
    onChange([
      ...scenes,
      {
        id: Math.random().toString(36).slice(2, 12), order: scenes.length, template: "typography-statement", duration: 4, headline: "New scene", subline: "", bullets: [],
        visualDescription: "", cameraMovement: "", animationDirection: "", animationPreset: "cinematic", transition: "crossfade", audioDirection: "", voiceOver: "", mediaIds: [],
      },
    ]);
  const total = scenes.reduce((a, s) => a + s.duration, 0);
  const visual = media.filter((m) => m.kind !== "audio");

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="row-between">
        <span className="muted small">{scenes.length} scenes · {total.toFixed(1)}s of scene time (transitions overlap)</span>
        <button className="btn btn-sm" onClick={add}><Icon name="plus" size={14} /> Add scene</button>
      </div>
      {scenes.map((s, i) => {
        const meta = templates.find((t) => t.id === s.template);
        return (
          <div key={s.id} className="panel panel-pad" style={{ padding: 18 }}>
            <div className="row-between" style={{ marginBottom: 14 }}>
              <div className="row">
                <span className="scene-num" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>{i + 1}</span>
                <select className="select" style={{ width: 220 }} value={s.template} onChange={(e) => set(i, { template: e.target.value as Scene["template"], variant: undefined })}>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                {meta?.variants && (
                  <select className="select" style={{ width: 200 }} value={s.variant ?? meta.variants[0].id} onChange={(e) => set(i, { variant: e.target.value })}>
                    {meta.variants.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                  </select>
                )}
                <div className="row" style={{ gap: 6 }}>
                  <input className="input" type="number" min={1.5} max={30} step={0.1} style={{ width: 84 }} value={s.duration} onChange={(e) => set(i, { duration: Number(e.target.value) })} />
                  <span className="dim small">sec</span>
                </div>
              </div>
              <div className="row" style={{ gap: 4 }}>
                <button className="btn btn-ghost btn-sm icon-btn" disabled={i === 0} onClick={() => move(i, -1)} title="Move up"><Icon name="up" size={15} /></button>
                <button className="btn btn-ghost btn-sm icon-btn" disabled={i === scenes.length - 1} onClick={() => move(i, 1)} title="Move down"><Icon name="down" size={15} /></button>
                <button className="btn btn-ghost btn-sm icon-btn btn-danger" onClick={() => remove(i)} title="Remove"><Icon name="trash" size={15} /></button>
              </div>
            </div>
            <div className="grid grid-2" style={{ gap: 14 }}>
              <div className="field"><label>On-screen headline {s.template === "typography-statement" && <span className="dim">(use | for line breaks)</span>}</label>
                <input className="input" value={s.headline} onChange={(e) => set(i, { headline: e.target.value })} /></div>
              <div className="field"><label>Supporting text / eyebrow</label><input className="input" value={s.subline} onChange={(e) => set(i, { subline: e.target.value })} /></div>
              {meta?.usesBullets && (
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label>{s.template === "final-cta" ? "Button label" : s.template === "house-build-3d" ? "Build phases (one per line)" : "Feature points (one per line, max 4)"}</label>
                  <textarea className="textarea" style={{ minHeight: 70 }} value={s.bullets.join("\n")} onChange={(e) => set(i, { bullets: e.target.value.split("\n") })} />
                </div>
              )}
              <div className="field"><label>Visual description</label><textarea className="textarea" value={s.visualDescription} onChange={(e) => set(i, { visualDescription: e.target.value })} /></div>
              <div className="field"><label>Voice-over script</label><textarea className="textarea" value={s.voiceOver} onChange={(e) => set(i, { voiceOver: e.target.value })} /></div>
              <div className="field"><label>Camera movement</label><input className="input" value={s.cameraMovement} onChange={(e) => set(i, { cameraMovement: e.target.value })} /></div>
              <div className="field"><label>Animation direction</label><input className="input" value={s.animationDirection} onChange={(e) => set(i, { animationDirection: e.target.value })} /></div>
              <div className="field"><label>Animation preset</label>
                <select className="select" value={s.animationPreset} onChange={(e) => set(i, { animationPreset: e.target.value as Scene["animationPreset"] })}>
                  <option value="gentle">Gentle (slower)</option><option value="cinematic">Cinematic</option><option value="dynamic">Dynamic (faster)</option>
                </select></div>
              <div className="field"><label>Transition to next scene</label>
                <select className="select" value={s.transition} onChange={(e) => set(i, { transition: e.target.value as Scene["transition"] })}>
                  {Object.entries(TRANSITIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select></div>
              <div className="field"><label>Audio direction</label><input className="input" value={s.audioDirection} onChange={(e) => set(i, { audioDirection: e.target.value })} /></div>
              {meta?.usesMedia && (
                <div className="field"><label>Scene media</label>
                  <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
                    {visual.length === 0 && <span className="dim small">Upload images or videos in the Media Library.</span>}
                    {visual.map((m) => {
                      const on = s.mediaIds.includes(m.id);
                      return (
                        <button key={m.id} type="button" title={m.originalName} onClick={() => set(i, { mediaIds: on ? s.mediaIds.filter((x) => x !== m.id) : [m.id, ...s.mediaIds] })}
                          style={{ width: 54, height: 40, borderRadius: 8, border: on ? "2px solid var(--accent)" : "1px solid var(--border)", background: `#0d0f14 url(${m.kind === "image" ? mediaUrl(m.id) : ""}) center/cover`, cursor: "pointer", color: "var(--text-3)", fontSize: 10 }}>
                          {m.kind === "video" ? "VIDEO" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
