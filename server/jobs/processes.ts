import { spawn, type ChildProcess } from "node:child_process";
import readline from "node:readline";

export class CancelledError extends Error {
  constructor() {
    super("Render cancelled");
  }
}

export interface RunOptions {
  cwd?: string;
  timeoutMs: number;
  env?: NodeJS.ProcessEnv;
  onLine?: (line: string) => void;
  signal?: AbortSignal;
}

/**
 * Run a render subprocess in its own process group (isolated from the API
 * process), stream its output line by line, enforce a timeout and allow
 * cancellation by killing the whole group.
 */
export function runProcess(cmd: string, args: string[], opts: RunOptions): Promise<{ code: number; tail: string[] }> {
  return new Promise((resolve, reject) => {
    const child: ChildProcess = spawn(cmd, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const tail: string[] = [];
    const push = (l: string) => {
      tail.push(l);
      if (tail.length > 60) tail.shift();
      opts.onLine?.(l);
    };
    readline.createInterface({ input: child.stdout! }).on("line", push);
    readline.createInterface({ input: child.stderr! }).on("line", push);

    let timedOut = false;
    let cancelled = false;
    const killGroup = () => {
      try {
        if (child.pid) process.kill(-child.pid, "SIGKILL");
      } catch {
        /* already gone */
      }
    };
    const timer = setTimeout(() => {
      timedOut = true;
      killGroup();
    }, opts.timeoutMs);
    const onAbort = () => {
      cancelled = true;
      killGroup();
    };
    opts.signal?.addEventListener("abort", onAbort, { once: true });

    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onAbort);
      if (cancelled) return reject(new CancelledError());
      if (timedOut) return reject(new Error(`Process timed out after ${Math.round(opts.timeoutMs / 1000)}s`));
      resolve({ code: code ?? 1, tail });
    });
  });
}
