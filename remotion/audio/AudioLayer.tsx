import React from "react";
import { Audio, Sequence, interpolate, useVideoConfig } from "remotion";
import type { AudioLayerProps } from "../../shared/types";

/**
 * Music / voice-over layer with frame-accurate fade in/out.
 * The fade-out is anchored to the end of the composition so music always
 * resolves with the final frame.
 */
export const AudioLayer: React.FC<{ track: AudioLayerProps }> = ({ track }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const len = Math.max(1, durationInFrames - track.startFrame);
  const fi = Math.max(1, Math.round(track.fadeIn * fps));
  const fo = Math.max(1, Math.round(track.fadeOut * fps));
  return (
    <Sequence from={track.startFrame} durationInFrames={len} layout="none">
      <Audio
        src={track.src}
        volume={(f) =>
          track.volume *
          Math.min(
            interpolate(f, [0, fi], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            interpolate(f, [len - fo, len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          )
        }
      />
    </Sequence>
  );
};
