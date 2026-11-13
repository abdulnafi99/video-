import React from "react";
import { AbsoluteFill, OffthreadVideo, Video, getRemotionEnvironment, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneManifestEntry } from "../../shared/types";

/**
 * Reusable bridge component: plays one HyperFrames-rendered scene file.
 * During server rendering OffthreadVideo extracts exact frames with FFmpeg;
 * in the browser Player a regular <Video> keeps scrubbing responsive.
 * HyperFrames scene files are silent — all audio is mixed by Remotion.
 */
export const SceneClip: React.FC<{ entry: SceneManifestEntry; placeholder?: { headline: string; template: string } }> = ({ entry, placeholder }) => {
  const env = getRemotionEnvironment();
  if (!entry.src) return <ScenePlaceholder headline={placeholder?.headline ?? ""} template={placeholder?.template ?? ""} />;
  const style: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };
  return (
    <AbsoluteFill style={{ backgroundColor: "#08090C" }}>
      {env.isRendering ? <OffthreadVideo src={entry.src} muted style={style} /> : <Video src={entry.src} muted style={style} />}
    </AbsoluteFill>
  );
};

/** Shown in the editor preview for scenes that have not been rendered yet. */
export const ScenePlaceholder: React.FC<{ headline: string; template: string }> = ({ headline, template }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const o = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "radial-gradient(60% 50% at 50% 45%, #1c1f27, #08090C)", alignItems: "center", justifyContent: "center", opacity: o }}>
      <div style={{ fontFamily: "Inter, sans-serif", color: "#C6A76B", letterSpacing: "0.3em", fontSize: 20 * u, textTransform: "uppercase" }}>{template}</div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#F5F5F7", fontSize: 72 * u, fontWeight: 600, marginTop: 24 * u, textAlign: "center", padding: `0 ${60 * u}px` }}>
        {headline.replace(/\|/g, " ")}
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", color: "#9297A3", fontSize: 24 * u, marginTop: 30 * u }}>Scene not rendered yet: render scenes to preview the final look</div>
    </AbsoluteFill>
  );
};
