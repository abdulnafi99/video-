/**
 * Seeds the PRC Group "Tiny House Perak" promo project:
 *   - imports the PRC logo into the media library
 *   - generates an original music bed + whoosh SFX (royalty-free)
 *   - creates the project with the hand-written Malay storyboard
 * Usage: npm run seed:prc
 */
import fs from "node:fs";
import path from "node:path";
import { computeTimeline, secondsToFrames } from "../../remotion/utils/timing";
import { createProject } from "../services/projects";
import { ingestFile } from "../services/media";
import { renderToM4a, synthAmbientBed, synthWhoosh } from "../services/music";
import { ROOT, TMP_DIR } from "../services/paths";
import { Projects } from "../storage/db";
import { prcScenes, PRC_PROJECT_BASE } from "./prc-project";

async function main() {
  const existing = Projects.list().find((p) => p.name === PRC_PROJECT_BASE.name);
  if (existing && !process.argv.includes("--force")) {
    console.log(`Project already exists: ${existing.id} (use --force to create another)`);
    console.log(existing.id);
    return;
  }

  const tmpLogo = path.join(TMP_DIR, "prc-logo.png");
  fs.copyFileSync(path.join(ROOT, "hyperframes", "assets", "brand", "prc-logo.png"), tmpLogo);
  const logo = await ingestFile({ tempPath: tmpLogo, originalName: "PRC Group logo.png", projectId: null, role: "logo", license: "Client-supplied brand asset (PRC Group Sdn Bhd)" });

  const scenes = prcScenes();
  const fps = 30;
  const timeline = computeTimeline(
    scenes.map((s) => ({ sceneId: s.id, durationInFrames: secondsToFrames(s.duration, fps), transition: s.transition })),
    fps,
  );
  const totalSec = timeline.totalFrames / fps;

  const musicTmp = path.join(TMP_DIR, "prc-music.m4a");
  await renderToM4a(synthAmbientBed(totalSec), musicTmp);
  const music = await ingestFile({ tempPath: musicTmp, originalName: `Warm ambient bed ${Math.round(totalSec)}s (generated).m4a`, projectId: null, role: "music", license: "Original — procedurally generated, royalty-free" });

  const whooshTmp = path.join(TMP_DIR, "prc-whoosh.m4a");
  await renderToM4a(synthWhoosh(), whooshTmp, -20);
  const whoosh = await ingestFile({ tempPath: whooshTmp, originalName: "Whoosh (generated).m4a", projectId: null, role: "sfx", license: "Original — procedurally generated, royalty-free" });

  const startOf = (id: string) => (timeline.entries.find((e) => e.sceneId === id)?.startFrame ?? 0) / fps;
  const project = createProject({
    ...PRC_PROJECT_BASE,
    brand: { ...PRC_PROJECT_BASE.brand, logoMediaId: logo.id },
    scenes: scenes.map((s) => ({ ...s, mediaIds: [] })),
    audio: {
      music: { mediaId: music.id, volume: 0.85, fadeIn: 0.8, fadeOut: 1.8, startAt: 0 },
      sfx: [
        { id: "w1", mediaId: whoosh.id, at: 0.1, volume: 0.5 },
        { id: "w2", mediaId: whoosh.id, at: Math.max(0, startOf("prc-s6") - 0.5), volume: 0.45 },
      ],
      subtitles: false,
    },
  });
  console.log(`Seeded project ${project.id}: ${project.name} (${totalSec.toFixed(2)}s, ${project.scenes.length} scenes)`);
  console.log(project.id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
