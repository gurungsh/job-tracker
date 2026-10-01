import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const entry = path.join(import.meta.dirname, "index.ts");

let tempDir: string;
let child: ChildProcess | undefined;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-tracker-index-"));
});

afterEach(() => {
  child?.kill("SIGKILL");
  child = undefined;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

function startServer(): { output: () => string; exited: Promise<number | null> } {
  let output = "";
  const proc = spawn(process.execPath, [entry], {
    env: { ...process.env, NODE_ENV: "test", PORT: "0", DATABASE_PATH: path.join(tempDir, "test.db") },
  });
  child = proc;
  proc.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));
  proc.stderr.on("data", (chunk: Buffer) => (output += chunk.toString()));
  const exited = new Promise<number | null>((resolve) => proc.on("exit", resolve));
  return { output: () => output, exited };
}

async function waitFor(check: () => boolean, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > deadline) throw new Error("Timed out waiting for the server");
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

describe("server process", () => {
  it.each(["SIGTERM", "SIGINT"] as const)("exits with code 0 within 5 seconds on %s", async (signal) => {
    const server = startServer();
    await waitFor(() => server.output().includes("Server listening"));

    const stoppedAt = Date.now();
    child?.kill(signal);
    const code = await server.exited;

    expect(code).toBe(0);
    expect(Date.now() - stoppedAt).toBeLessThan(5000);
  });
});
