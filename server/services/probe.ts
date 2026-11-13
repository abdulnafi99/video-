import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export interface ProbeResult {
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  frames?: number;
  videoCodec?: string;
  audioCodec?: string;
  pixFmt?: string;
}

/** ffprobe wrapper used to validate uploads, scene renders and final exports. */
export async function probe(file: string): Promise<ProbeResult> {
  const { stdout } = await run(
    "ffprobe",
    ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file],
    { timeout: 30_000, maxBuffer: 4 * 1024 * 1024 },
  );
  const j = JSON.parse(stdout) as {
    format?: { duration?: string };
    streams?: { codec_type: string; codec_name: string; width?: number; height?: number; r_frame_rate?: string; nb_frames?: string; pix_fmt?: string; duration?: string }[];
  };
  const v = j.streams?.find((s) => s.codec_type === "video");
  const a = j.streams?.find((s) => s.codec_type === "audio");
  let fps: number | undefined;
  if (v?.r_frame_rate) {
    const [n, d] = v.r_frame_rate.split("/").map(Number);
    if (n && d) fps = n / d;
  }
  return {
    duration: j.format?.duration ? Number(j.format.duration) : v?.duration ? Number(v.duration) : undefined,
    width: v?.width,
    height: v?.height,
    fps,
    frames: v?.nb_frames ? Number(v.nb_frames) : undefined,
    videoCodec: v?.codec_name,
    audioCodec: a?.codec_name,
    pixFmt: v?.pix_fmt,
  };
}
