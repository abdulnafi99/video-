import React, { useState } from "react";
import { motion } from "framer-motion";
import type { AspectFormat } from "../../shared/types";
import { FORMAT_DIMENSIONS } from "../../shared/types";
import { Page, PageHead, useLoad } from "../components/ui";
import { useFit } from "../editor/ScenePreview";
import { api } from "../services/api";

/** Every scene template, previewed live from its real HyperFrames composition. */
export const SceneLibrary: React.FC = () => {
  const { data } = useLoad(api.templates);
  const [format, setFormat] = useState<AspectFormat>("16:9");
  const [focus, setFocus] = useState<string | null>(null);
  return (
    <Page>
      <PageHead eyebrow="HyperFrames" title="Scene Library" subtitle="Reusable cinematic templates. Each one is an independent HTML composition that previews live and renders on its own."
        actions={<div className="tabs">{(Object.keys(FORMAT_DIMENSIONS) as AspectFormat[]).map((f) => <button key={f} className={`tab ${format === f ? "on" : ""}`} onClick={() => setFormat(f)}>{f}</button>)}</div>} />
      <div className="grid grid-3">
        {data?.map((t, i) => (
          <motion.div key={t.id} className="panel template-card" style={{ overflow: "hidden" }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <LivePreview id={t.id} format={format} active={focus === t.id || focus === null} />
            <div style={{ padding: "14px 16px 16px" }} onMouseEnter={() => setFocus(t.id)}>
              <div className="row-between"><div style={{ fontWeight: 600 }}>{t.label}</div><span className="badge plain">{t.defaultDuration}s</span></div>
              <div className="muted small" style={{ marginTop: 6 }}>{t.description}</div>
              <div className="row" style={{ marginTop: 10, gap: 6, flexWrap: "wrap" }}>
                {t.usesMedia && <span className="badge plain">uses media</span>}
                {t.usesBullets && <span className="badge plain">points</span>}
                {t.variants?.map((v) => <span key={v.id} className="badge plain">{v.label}</span>)}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Page>
  );
};

const LivePreview: React.FC<{ id: string; format: AspectFormat; active: boolean }> = ({ id, format }) => {
  const { width, height } = FORMAT_DIMENSIONS[format];
  const { ref, scale } = useFit(width, height, 0);
  return (
    <div ref={ref} style={{ position: "relative", aspectRatio: "16 / 10", background: "#08090C", overflow: "hidden", display: "grid", placeItems: "center" }}>
      <div style={{ position: "relative", width: width * scale, height: height * scale, overflow: "hidden" }}>
        <iframe title={id} src={`/api/templates/${id}/preview/?format=${encodeURIComponent(format)}`} sandbox="allow-scripts allow-same-origin" loading="lazy"
          style={{ width, height, transform: `scale(${scale})` }} />
      </div>
    </div>
  );
};
