import fs from "node:fs";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import { projects } from "./routes/projects";
import { api } from "./routes/assets";
import { recoverJobs } from "./jobs/queue";
import { ROOT } from "./services/paths";

const app = express();
const PORT = Number(process.env.PORT || 4317);
const HOST = process.env.HOST || "127.0.0.1";
const TOKEN = process.env.CINEMOTION_API_TOKEN; // optional shared secret for non-local deployments

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});

// Private assets: every /api route (including media and exports) requires the token when one is configured.
app.use("/api", (req, res, next) => {
  if (!TOKEN) return next();
  const header = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const cookie = req.headers.cookie?.match(/(?:^|;\s*)cm_token=([^;]+)/)?.[1];
  const query = typeof req.query.token === "string" ? req.query.token : undefined;
  if ([header, cookie, query].includes(TOKEN)) return next();
  res.status(401).json({ error: "Unauthorized" });
});

app.get("/api/health", (_req, res) => res.json({ ok: true, name: "CINEMOTION STUDIO", time: new Date().toISOString() }));
app.use("/api/projects", projects);
app.use("/api", api);

// Production: serve the built SPA
const dist = path.join(ROOT, "dist");
if (fs.existsSync(path.join(dist, "index.html"))) {
  app.use(express.static(dist, { index: false, maxAge: "1h" }));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.use((err: Error & { status?: number; code?: string }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.code === "LIMIT_FILE_SIZE" ? 413 : err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? "Internal server error" : err.message });
});

recoverJobs();
app.listen(PORT, HOST, () => console.log(`CINEMOTION STUDIO API on http://${HOST}:${PORT}`));
