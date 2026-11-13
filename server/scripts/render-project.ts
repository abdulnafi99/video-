/**
 * Headless render: runs the same background job pipeline the API uses.
 * Usage: npm run render:cli -- <projectId> [--quality draft|standard|high] [--fps 30|60]
 */
import { enqueue, onJobUpdate, recoverJobs } from "../jobs/queue";
import { Projects } from "../storage/db";

const args = process.argv.slice(2);
const projectId = args.find((a) => !a.startsWith("--")) ?? Projects.list()[0]?.id;
const opt = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
if (!projectId || !Projects.get(projectId)) {
  console.error("Project not found. Run npm run seed:prc first.");
  process.exit(1);
}
recoverJobs();
const job = enqueue(projectId, "full", { quality: (opt("quality") as "draft") ?? "standard", fps: opt("fps") === "60" ? 60 : 30 });
let last = "";
const started = Date.now();
onJobUpdate((j) => {
  if (j.id !== job.id) return;
  const line = `[${((Date.now() - started) / 1000).toFixed(0).padStart(4)}s] ${j.progress.toFixed(1).padStart(5)}%  ${j.stage}`;
  if (line !== last) console.log((last = line));
  if (j.status === "completed") {
    console.log(`\nDONE → ${j.outputFile}\n${j.log.join("\n")}`);
    process.exit(0);
  }
  if (j.status === "failed" || j.status === "cancelled") {
    console.error(`\n${j.status.toUpperCase()}: ${j.error ?? ""}\n${j.log.join("\n")}`);
    process.exit(1);
  }
});
