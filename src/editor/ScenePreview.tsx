import React, { useEffect, useRef, useState } from "react";

/** Fits a fixed-size composition (e.g. 1080×1920) into the available box. */
export function useFit(width: number, height: number, pad = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setScale(Math.max(0.05, Math.min((r.width - pad) / width, (r.height - pad) / height)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height, pad]);
  return { ref, scale };
}

/** Live HyperFrames scene preview: the real composition HTML in a sandboxed iframe. */
export const ScenePreview: React.FC<{ src: string; width: number; height: number; playing: boolean; onTime?: (t: number, d: number) => void; restartKey?: number }> = ({
  src, width, height, playing, onTime, restartKey,
}) => {
  const { ref, scale } = useFit(width, height, 36);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ source: "cinemotion", type: playing ? "play" : "pause" }, "*");
  }, [playing]);
  useEffect(() => {
    if (restartKey) frame.current?.contentWindow?.postMessage({ source: "cinemotion", type: "seek", time: 0 }, "*");
    if (restartKey && playing) setTimeout(() => frame.current?.contentWindow?.postMessage({ source: "cinemotion", type: "play" }, "*"), 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartKey]);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source === frame.current?.contentWindow && e.data?.source === "cinemotion-scene") onTime?.(e.data.time, e.data.duration);
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [onTime]);
  return (
    <div ref={ref} style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
      <div className="preview-frame" style={{ width: width * scale, height: height * scale }}>
        <iframe
          ref={frame}
          title="Scene preview"
          src={src}
          sandbox="allow-scripts allow-same-origin"
          width={width}
          height={height}
          style={{ width, height, transform: `scale(${scale})` }}
          onLoad={() => !playing && frame.current?.contentWindow?.postMessage({ source: "cinemotion", type: "pause" }, "*")}
        />
      </div>
    </div>
  );
};
