import React from "react";
import { Composition, type CalculateMetadataFunction } from "remotion";
import { MainComposition } from "./compositions/MainComposition";
import type { MainCompositionProps } from "../shared/types";
import { manifestTotalFrames } from "./utils/timing";

export const COMPOSITION_ID = "CinemotionMain";

const defaultProps: MainCompositionProps = {
  manifest: { projectId: "demo", version: 1, width: 1080, height: 1920, fps: 30, scenes: [], generatedAt: "" },
  sfx: [],
  subtitles: [],
  showSubtitles: false,
  brand: { accent: "#C6A76B", text: "#F5F5F7", background: "#08090C", font: "Inter, sans-serif" },
};

/** Size, fps and length always come from the scene manifest. */
export const calculateMetadata: CalculateMetadataFunction<MainCompositionProps> = ({ props }) => ({
  width: props.manifest.width,
  height: props.manifest.height,
  fps: props.manifest.fps,
  durationInFrames: Math.max(1, manifestTotalFrames(props.manifest)),
});

export const RemotionRoot: React.FC = () => (
  <Composition
    id={COMPOSITION_ID}
    component={MainComposition}
    defaultProps={defaultProps}
    calculateMetadata={calculateMetadata}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={30}
  />
);
