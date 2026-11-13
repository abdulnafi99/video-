import React from "react";
import { AbsoluteFill } from "remotion";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { none } from "@remotion/transitions/none";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import type { TransitionType } from "../../shared/types";

type Empty = Record<string, never>;

/** Fade to black: the outgoing scene fades out fully before the next fades in. */
const FadeBlackComp: React.FC<TransitionPresentationComponentProps<Empty>> = ({ children, presentationDirection, presentationProgress }) => {
  const p = presentationProgress;
  const opacity = presentationDirection === "exiting" ? Math.max(0, 1 - p * 2) : Math.max(0, p * 2 - 1);
  return React.createElement(AbsoluteFill, { style: { opacity, backgroundColor: "transparent" } }, children);
};
const fadeBlack = (): TransitionPresentation<Empty> => ({ component: FadeBlackComp, props: {} as Empty });

/** Cinematic dissolve: crossfade with a gentle scale and blur on both sides. */
const DissolveComp: React.FC<TransitionPresentationComponentProps<Empty>> = ({ children, presentationDirection, presentationProgress }) => {
  const p = presentationProgress;
  const entering = presentationDirection === "entering";
  const opacity = entering ? p : 1;
  const blur = entering ? (1 - p) * 14 : p * 10;
  const scale = entering ? 1.04 - 0.04 * p : 1 + 0.03 * p;
  return React.createElement(AbsoluteFill, { style: { opacity, filter: `blur(${blur.toFixed(2)}px)`, transform: `scale(${scale})` } }, children);
};
const dissolve = (): TransitionPresentation<Empty> => ({ component: DissolveComp, props: {} as Empty });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function presentationFor(type: TransitionType): TransitionPresentation<any> {
  switch (type) {
    case "crossfade":
      return fade();
    case "slide":
      return slide({ direction: "from-right" });
    case "fade-black":
      return fadeBlack();
    case "dissolve":
      return dissolve();
    case "match-cut":
    default:
      return none();
  }
}
