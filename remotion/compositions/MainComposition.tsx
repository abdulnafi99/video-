import React from "react";
import { AbsoluteFill, Audio, Sequence } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import type { MainCompositionProps } from "../../shared/types";
import { computeTimeline } from "../utils/timing";
import { presentationFor } from "../transitions";
import { SceneClip } from "../components/SceneClip";
import { Subtitles } from "../components/Subtitles";
import { AudioLayer } from "../audio/AudioLayer";

/**
 * Final composition: sequences HyperFrames scene renders with transitions,
 * then layers music, voice-over, sound effects and subtitles on top.
 * Frame math comes from computeTimeline so audio/subtitles stay in sync.
 */
export const MainComposition: React.FC<MainCompositionProps> = (props) => {
  const { manifest } = props;
  const { entries } = computeTimeline(manifest.scenes, manifest.fps);
  return (
    <AbsoluteFill style={{ backgroundColor: props.brand.background || "#08090C" }}>
      <TransitionSeries>
        {manifest.scenes.flatMap((scene, i) => {
          const items = [
            <TransitionSeries.Sequence key={`s-${scene.sceneId}`} durationInFrames={scene.durationInFrames}>
              <SceneClip entry={scene} placeholder={props.previewPlaceholders?.[scene.sceneId]} />
            </TransitionSeries.Sequence>,
          ];
          const tFrames = entries[i]?.transitionOutFrames ?? 0;
          if (i < manifest.scenes.length - 1 && tFrames > 0) {
            items.push(
              <TransitionSeries.Transition
                key={`t-${scene.sceneId}`}
                presentation={presentationFor(scene.transition)}
                timing={linearTiming({ durationInFrames: tFrames })}
              />,
            );
          }
          return items;
        })}
      </TransitionSeries>

      {props.showSubtitles && props.subtitles.length > 0 ? <Subtitles cues={props.subtitles} font={props.brand.font} /> : null}

      {props.music ? <AudioLayer track={props.music} /> : null}
      {props.voiceOver ? <AudioLayer track={props.voiceOver} /> : null}
      {props.sfx.map((s, i) => (
        <Sequence key={i} from={s.startFrame} layout="none">
          <Audio src={s.src} volume={s.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
