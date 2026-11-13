import React, { useEffect, useState } from "react";
import { Field, Page, PageHead, useToast } from "../components/ui";
import { api } from "../services/api";

export const SettingsPage: React.FC = () => {
  const toast = useToast();
  const [s, setS] = useState<{ defaultQuality: string; defaultFps: number }>({ defaultQuality: "standard", defaultFps: 30 });
  const [health, setHealth] = useState<string>("checking…");
  useEffect(() => {
    api.settings().then((x) => setS((cur) => ({ ...cur, ...(x as typeof cur) })));
    fetch("/api/health").then((r) => r.json()).then((h) => setHealth(h.ok ? "Online" : "Unavailable")).catch(() => setHealth("Unavailable"));
  }, []);
  return (
    <Page>
      <PageHead eyebrow="Preferences" title="Settings" />
      <div className="grid grid-2">
        <div className="panel panel-pad stack" style={{ gap: 16 }}>
          <h2 className="section">Render defaults</h2>
          <Field label="Default quality"><select className="select" value={s.defaultQuality} onChange={(e) => setS({ ...s, defaultQuality: e.target.value })}><option value="draft">Draft (fast preview)</option><option value="standard">Standard (CRF 19)</option><option value="high">High (CRF 16)</option></select></Field>
          <Field label="Default frame rate"><select className="select" value={s.defaultFps} onChange={(e) => setS({ ...s, defaultFps: Number(e.target.value) })}><option value={30}>30 fps</option><option value={60}>60 fps</option></select></Field>
          <div><button className="btn btn-primary" onClick={async () => { await api.saveSettings(s); toast("Settings saved"); }}>Save</button></div>
        </div>
        <div className="panel panel-pad stack" style={{ gap: 10 }}>
          <h2 className="section">System</h2>
          <div className="row-between"><span className="muted">API server</span><span>{health}</span></div>
          <div className="row-between"><span className="muted">Scene engine</span><span>HyperFrames 0.9.40 · GSAP 3.15 · Three.js r187</span></div>
          <div className="row-between"><span className="muted">Composition engine</span><span>Remotion 4.0.543</span></div>
          <div className="row-between"><span className="muted">Output</span><span>MP4 · H.264 · AAC 192 kbps · yuv420p</span></div>
          <div className="row-between"><span className="muted">Storage</span><span>SQLite metadata + private file store</span></div>
          <p className="dim small">Set CINEMOTION_API_TOKEN on the server to require a token for every API and media request when deploying beyond localhost.</p>
        </div>
      </div>
    </Page>
  );
};
