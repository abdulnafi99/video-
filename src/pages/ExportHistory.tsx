import React, { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "../components/Icon";
import { Empty, Page, PageHead, useLoad } from "../components/ui";
import { api, fmtBytes, fmtDate, fmtDur } from "../services/api";

export const ExportHistory: React.FC = () => {
  const { data } = useLoad(api.exports);
  const [playing, setPlaying] = useState<string | null>(null);
  return (
    <Page>
      <PageHead eyebrow="Delivery" title="Export History" subtitle="Verified masters with thumbnail, subtitles, project configuration and a social-ready 720p copy." />
      {data && data.length === 0 ? <div className="panel"><Empty title="No exports yet" icon={<Icon name="history" size={30} />}>Render a project to create your first master.</Empty></div> : (
        <div className="grid grid-3">
          {data?.map((e, i) => {
            const vertical = e.height > e.width;
            return (
              <motion.div key={e.id} className="panel" style={{ overflow: "hidden" }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div style={{ background: "#000", aspectRatio: vertical ? "4 / 5" : "16 / 10", display: "grid", placeItems: "center", position: "relative", cursor: "pointer" }} onClick={() => setPlaying(e.id)}>
                  {playing === e.id ? (
                    <video src={`/api/exports/${e.id}/stream`} controls autoPlay style={{ height: "100%", maxWidth: "100%" }} />
                  ) : (
                    <>
                      <img src={`/api/exports/${e.id}/thumbnail`} alt="" style={{ height: "100%", maxWidth: "100%", objectFit: "contain" }} />
                      <div style={{ position: "absolute", width: 58, height: 58, borderRadius: "50%", background: "rgba(8,9,12,.6)", border: "1px solid rgba(255,255,255,.25)", display: "grid", placeItems: "center", backdropFilter: "blur(8px)" }}><Icon name="play" size={22} /></div>
                    </>
                  )}
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ fontWeight: 600 }}>{e.projectName}</div>
                  <div className="dim small" style={{ marginTop: 4 }}>{e.width}×{e.height} · {e.fps} fps · {fmtDur(e.duration)} · {e.videoCodec.toUpperCase()}/{(e.audioCodec ?? "no audio").toUpperCase()} · {fmtBytes(e.size)}</div>
                  <div className="dim small">{fmtDate(e.createdAt)}</div>
                  <div className="row" style={{ marginTop: 14, flexWrap: "wrap", gap: 8 }}>
                    <a className="btn btn-primary btn-sm" href={`/api/exports/${e.id}/video`}><Icon name="download" size={14} /> MP4 master</a>
                    <a className="btn btn-sm" href={`/api/exports/${e.id}/social`}>Social 720p</a>
                    <a className="btn btn-sm" href={`/api/exports/${e.id}/thumbnail`} download>Thumbnail</a>
                    <a className="btn btn-sm" href={`/api/exports/${e.id}/subtitles`}>SRT</a>
                    <a className="btn btn-sm" href={`/api/exports/${e.id}/config`}>Config</a>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </Page>
  );
};
