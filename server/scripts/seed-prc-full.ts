/**
 * Seeds the extended PRC Group promo (~60s) with website content and a
 * Bahasa Melayu voice-over. Scene durations are fitted to the spoken lines.
 * Usage: npx tsx server/scripts/seed-prc-full.ts
 */
import fs from "node:fs";
import path from "node:path";
import { computeTimeline, secondsToFrames } from "../../remotion/utils/timing";
import { createProject, updateProject } from "../services/projects";
import { ingestFile } from "../services/media";
import { renderToM4a, synthAmbientBed, synthWhoosh } from "../services/music";
import { buildProjectVoiceOver, measureLines } from "../services/tts";
import { ROOT, TMP_DIR } from "../services/paths";
import { Media, Projects } from "../storage/db";
import { prcScenesFull, PRC_PROJECT_BASE } from "./prc-project";

const NAME = "PRC Group — Promo Penuh 60s (BM + suara latar)";

async function main() {
  const old = Projects.list().find((p) => p.name === NAME);
  if (old && !process.argv.includes("--force")) {
    console.log(old.id);
    return;
  }
  let logo = Media.list().find((m) => m.role === "logo" && m.originalName === "PRC Group logo.png");
  if (!logo) {
    const tmp = path.join(TMP_DIR, "prc-logo.png");
    fs.copyFileSync(path.join(ROOT, "hyperframes", "assets", "brand", "prc-logo.png"), tmp);
    logo = await ingestFile({ tempPath: tmp, originalName: "PRC Group logo.png", projectId: null, role: "logo", license: "Client-supplied brand asset (PRC Group Sdn Bhd)" });
  }

  // fit each scene to its spoken line (lead-in 0.35s + tail room)
  const base = prcScenesFull();
  const voDur = await measureLines(base.map((s) => s.voiceOver), "ms");
  const scenes = base.map((s, i) => ({ ...s, mediaIds: [], duration: Math.max(s.duration, Math.round((voDur[i] + 1.5) * 10) / 10) }));
  const fps = 30;
  const tl = computeTimeline(scenes.map((s) => ({ sceneId: s.id, durationInFrames: secondsToFrames(s.duration, fps), transition: s.transition })), fps);
  const total = tl.totalFrames / fps;

  const musicTmp = path.join(TMP_DIR, "prcf-music.m4a");
  await renderToM4a(synthAmbientBed(total), musicTmp);
  const music = await ingestFile({ tempPath: musicTmp, originalName: `Warm ambient bed ${Math.round(total)}s (generated).m4a`, projectId: null, role: "music", license: "Original — procedurally generated, royalty-free" });
  const wTmp = path.join(TMP_DIR, "prcf-whoosh.m4a");
  await renderToM4a(synthWhoosh(), wTmp, -20);
  const whoosh = await ingestFile({ tempPath: wTmp, originalName: "Whoosh (generated).m4a", projectId: null, role: "sfx", license: "Original — procedurally generated, royalty-free" });
  const startOf = (id: string) => (tl.entries.find((e) => e.sceneId === id)?.startFrame ?? 0) / fps;

  let project = createProject({
    ...PRC_PROJECT_BASE,
    name: NAME,
    duration: Math.round(total),
    description: PRC_PROJECT_BASE.description + " Perkhidmatan: reka & bina, rumah baharu, ubah suai & tambahan, pembesaran rumah, kerja dalaman, konsultasi & pengurusan projek.",
    brand: { ...PRC_PROJECT_BASE.brand, logoMediaId: logo.id },
    scenes,
    audio: {
      music: { mediaId: music.id, volume: 0.42, fadeIn: 0.8, fadeOut: 2, startAt: 0 },
      sfx: [
        { id: "w1", mediaId: whoosh.id, at: 0.1, volume: 0.45 },
        { id: "w2", mediaId: whoosh.id, at: Math.max(0, startOf("prcf-s9") - 0.5), volume: 0.4 },
      ],
      subtitles: false,
    },
  });

  const voTmp = path.join(TMP_DIR, "prcf-vo.m4a");
  const { placed } = await buildProjectVoiceOver(project, voTmp);
  const vo = await ingestFile({ tempPath: voTmp, originalName: "Voice-over BM (generated).m4a", projectId: project.id, role: "voice-over", license: "Synthetic voice generated offline (espeak-ng / MBROLA ma1)" });
  project = updateProject(project, { audio: { ...project.audio, voiceOver: { mediaId: vo.id, volume: 1, fadeIn: 0.05, fadeOut: 0.3, startAt: 0 } } });
  for (const p of placed) console.log(`${p.sceneId}: VO ${p.start.toFixed(2)}–${p.end.toFixed(2)}s${p.overrun > 0 ? ` (overrun ${p.overrun.toFixed(2)}s)` : ""}`);
  console.log(`Seeded ${project.id}: ${total.toFixed(2)}s, ${scenes.length} scenes`);
  console.log(project.id);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
