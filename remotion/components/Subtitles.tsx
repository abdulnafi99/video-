import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { SubtitleCue } from "../../shared/types";

export const Subtitles: React.FC<{ cues: SubtitleCue[]; font: string }> = ({ cues, font }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cue = cues.find((c) => frame >= c.startFrame && frame <= c.endFrame);
  if (!cue) return null;
  const u = Math.min(width, height) / 1080;
  const o = Math.min(
    interpolate(frame, [cue.startFrame, cue.startFrame + 6], [0, 1], { extrapolateRight: "clamp" }),
    interpolate(frame, [cue.endFrame - 6, cue.endFrame], [1, 0], { extrapolateLeft: "clamp" }),
  );
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: height > width ? 330 * u : 90 * u }}>
      <div
        style={{
          opacity: o, maxWidth: "86%", textAlign: "center", fontFamily: font, fontWeight: 500, fontSize: 40 * u, lineHeight: 1.3,
          color: "#F5F5F7", background: "rgba(8,9,12,0.62)", padding: `${14 * u}px ${28 * u}px`, borderRadius: 18 * u,
          backdropFilter: "blur(10px)",
        }}
      >
        {cue.text}
      </div>
    </AbsoluteFill>
  );
};
