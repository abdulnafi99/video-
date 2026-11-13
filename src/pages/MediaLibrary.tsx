import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import type { MediaKind, MediaRole } from "../../shared/types";
import { Icon } from "../components/Icon";
import { Empty, Page, PageHead, useLoad, useToast } from "../components/ui";
import { api, fmtBytes, fmtDur, mediaUrl } from "../services/api";

const ROLES: MediaRole[] = ["logo", "product-image", "product-video", "screenshot", "background", "music", "voice-over", "sfx", "other"];

export const MediaLibrary: React.FC = () => {
  const toast = useToast();
  const { data, reload } = useLoad(() => api.media());
  const [filter, setFilter] = useState<MediaKind | "all">("all");
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const r = await api.upload([...files], {});
      r.errors.forEach((e) => toast(e, true));
      if (r.assets.length) toast(`${r.assets.length} file(s) validated and stored`);
      reload();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };
  const items = (data ?? []).filter((m) => filter === "all" || m.kind === filter);

  return (
    <Page>
      <PageHead eyebrow="Assets" title="Media Library" subtitle="Logos, product images, footage and audio. Files are type-checked by content, size-limited and stored privately." />
      <div className={`dropzone ${over ? "over" : ""}`} onClick={() => input.current?.click()} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files); }}>
        <Icon name="upload" size={26} />
        <div style={{ fontWeight: 600, color: "var(--text)", marginTop: 8 }}>{busy ? "Uploading & validating…" : "Drop files here or click to browse"}</div>
        <div className="small" style={{ marginTop: 4 }}>PNG, JPG, WEBP · MP4, MOV, WEBM · MP3, WAV, M4A, AAC</div>
        <input ref={input} type="file" multiple hidden accept=".png,.jpg,.jpeg,.webp,.mp4,.mov,.webm,.mp3,.wav,.m4a,.aac" onChange={(e) => upload(e.target.files)} />
      </div>
      <div className="row-between" style={{ margin: "26px 0 16px" }}>
        <div className="tabs">{(["all", "image", "video", "audio"] as const).map((k) => <button key={k} className={`tab ${filter === k ? "on" : ""}`} onClick={() => setFilter(k)} style={{ textTransform: "capitalize" }}>{k}</button>)}</div>
        <span className="dim small">{items.length} items</span>
      </div>
      {items.length === 0 ? <div className="panel"><Empty title="No media yet" icon={<Icon name="media" size={30} />} /></div> : (
        <div className="grid grid-4">
          {items.map((m, i) => (
            <motion.div key={m.id} className="panel media-tile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }}>
              <div className={`media-thumb ${m.kind === "image" ? "checker" : ""}`}>
                {m.kind === "image" && <img src={mediaUrl(m.id)} alt="" loading="lazy" />}
                {m.kind === "video" && <video src={mediaUrl(m.id)} muted preload="metadata" onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => e.currentTarget.pause()} />}
                {m.kind === "audio" && <div style={{ width: "86%" }}><Icon name="audio" size={28} /><audio src={mediaUrl(m.id)} controls style={{ width: "100%", marginTop: 10 }} /></div>}
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={m.originalName}>{m.originalName}</div>
                <div className="dim small">{m.width ? `${m.width}×${m.height} · ` : ""}{m.duration ? `${fmtDur(m.duration)} · ` : ""}{fmtBytes(m.size)}</div>
                {m.license && <div className="dim small" title={m.license} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.license}</div>}
                <div className="row" style={{ marginTop: 10, gap: 6 }}>
                  <select className="select" style={{ height: 30, padding: "0 28px 0 10px", fontSize: 12 }} value={m.role} onChange={async (e) => { await api.updateMedia(m.id, { role: e.target.value as MediaRole }); reload(); }}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button className="btn btn-ghost btn-sm icon-btn btn-danger" title="Delete" onClick={async () => { if (confirm(`Delete ${m.originalName}?`)) { await api.deleteMedia(m.id); reload(); } }}><Icon name="trash" size={15} /></button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </Page>
  );
};
