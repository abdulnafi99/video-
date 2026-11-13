/**
 * Isolated Remotion render worker. Invoked as a child process by the job
 * pipeline:  tsx server/jobs/remotion-worker.ts <job.json>
 *
 * - bundles the Remotion project once (cached by source hash)
 * - serves ONLY the files listed in the job's assetMap on 127.0.0.1
 * - renders H.264/AAC MP4 and reports progress as "@progress {json}" lines
 */
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { MainCompositionProps } from "../../shared/types";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const DATA = path.resolve(process.env.CINEMOTION_DATA_DIR || path.join(ROOT, "data"));

interface WorkerJob {
  props: MainCompositionProps;
  assetMap: Record<string, string>;
  output: string;
  quality: "draft" | "standard" | "high";
}

const report = (stage: string, p: number) => process.stdout.write(`@progress ${JSON.stringify({ stage, p })}\n`);

function hashSources(): string {
  const h = crypto.createHash("sha256");
  const walk = (dir: string) => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) walk(p);
      else if (/\.(tsx?|css)$/.test(f.name)) h.update(p).update(fs.readFileSync(p));
    }
  };
  walk(path.join(ROOT, "remotion"));
  walk(path.join(ROOT, "shared"));
  h.update(fs.readFileSync(path.join(ROOT, "package-lock.json")));
  return h.digest("hex").slice(0, 16);
}

async function getBundle() {
  const dir = path.join(DATA, "remotion-bundle", hashSources());
  if (fs.existsSync(path.join(dir, "index.html"))) return dir;
  report("Bundling Remotion project", 0.01);
  return bundle({
    entryPoint: path.join(ROOT, "remotion", "index.ts"),
    outDir: dir,
    onProgress: (p) => report("Bundling Remotion project", (p / 100) * 0.08),
  });
}

function findBrowser(): string | undefined {
  if (process.env.REMOTION_BROWSER_EXECUTABLE) return process.env.REMOTION_BROWSER_EXECUTABLE;
  const base = "/opt/pw-browsers";
  if (!fs.existsSync(base)) return undefined;
  const shell = fs.readdirSync(base).find((d) => d.startsWith("chromium_headless_shell"));
  if (!shell) return undefined;
  const sub = fs.readdirSync(path.join(base, shell)).find((d) => fs.existsSync(path.join(base, shell, d, "chrome-headless-shell")));
  return sub ? path.join(base, shell, sub, "chrome-headless-shell") : undefined;
}

/** Minimal read-only server: only whitelisted files, with Range support for video seeking. */
function startAssetServer(assetMap: Record<string, string>): Promise<{ url: string; close: () => void }> {
  const types: Record<string, string> = { ".mp4": "video/mp4", ".m4a": "audio/mp4", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".aac": "audio/aac", ".webm": "video/webm" };
  const server = http.createServer((req, res) => {
    const key = decodeURIComponent((req.url || "/").split("?")[0].replace(/^\/+/, ""));
    const file = assetMap[key];
    if (!file || !fs.existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    const size = fs.statSync(file).size;
    const type = types[path.extname(file).toLowerCase()] || "application/octet-stream";
    const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Accept-Ranges", "bytes");
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      res.writeHead(206, { "Content-Type": type, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1 });
      fs.createReadStream(file, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { "Content-Type": type, "Content-Length": size });
      fs.createReadStream(file).pipe(res);
    }
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      resolve({ url: `http://127.0.0.1:${addr.port}/`, close: () => server.close() });
    }),
  );
}

async function main() {
  const jobPath = process.argv[2];
  if (!jobPath) throw new Error("usage: remotion-worker <job.json>");
  const job = JSON.parse(fs.readFileSync(jobPath, "utf8")) as WorkerJob;
  const serveUrl = await getBundle();
  const assets = await startAssetServer(job.assetMap);
  try {
    const abs = (rel: string) => assets.url + rel.split("/").map(encodeURIComponent).join("/");
    const props: MainCompositionProps = {
      ...job.props,
      manifest: { ...job.props.manifest, scenes: job.props.manifest.scenes.map((s) => ({ ...s, src: abs(s.src) })) },
      music: job.props.music ? { ...job.props.music, src: abs(job.props.music.src) } : undefined,
      voiceOver: job.props.voiceOver ? { ...job.props.voiceOver, src: abs(job.props.voiceOver.src) } : undefined,
      sfx: job.props.sfx.map((s) => ({ ...s, src: abs(s.src) })),
    };
    const browserExecutable = findBrowser();
    report("Preparing composition", 0.09);
    const composition = await selectComposition({ serveUrl, id: "CinemotionMain", inputProps: props, browserExecutable });
    const tmp = job.output + ".part.mp4";
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      audioCodec: "aac",
      audioBitrate: "192k",
      crf: job.quality === "draft" ? 26 : job.quality === "high" ? 16 : 19,
      pixelFormat: "yuv420p",
      x264Preset: job.quality === "draft" ? "veryfast" : "medium",
      outputLocation: tmp,
      inputProps: props,
      browserExecutable,
      concurrency: Math.max(1, Math.min(4, (await import("node:os")).cpus().length)),
      timeoutInMilliseconds: 120_000,
      overwrite: true,
      onProgress: ({ progress, stitchStage }) =>
        report(stitchStage === "muxing" ? "Muxing audio and video" : "Composing final video (Remotion)", 0.1 + progress * 0.9),
    });
    fs.renameSync(tmp, job.output);
    report("Remotion render finished", 1);
  } finally {
    assets.close();
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e instanceof Error ? e.stack || e.message : String(e));
    process.exit(1);
  },
);
