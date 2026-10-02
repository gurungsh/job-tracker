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

function startServer(env: NodeJS.ProcessEnv = {}): { output: () => string; exited: Promise<number | null> } {
  let output = "";
  const proc = spawn(process.execPath, [entry], {
    env: { ...process.env, LOG_LEVEL: "", NODE_ENV: "test", PORT: "0", DATABASE_PATH: path.join(tempDir, "test.db"), ...env },
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

describe("startup logging", () => {
  it("logs starting, each migration, and listening, in the terminal and in a log file next to the database", async () => {
    const server = startServer();
    await waitFor(() => server.output().includes("Server listening"));

    const output = server.output();
    expect(output).toMatch(/^\S+ INFO {2}Server starting port=0 databasePath=\S+ logDir=\S+ logLevel=debug$/m);
    expect(output).toMatch(/^\S+ INFO {2}Migration applied name=0001_create_companies_and_applications\.sql$/m);
    expect(output).toMatch(/^\S+ INFO {2}Server listening on http:\/\/localhost:\d+ port=\d+$/m);

    const logDir = path.join(tempDir, "logs");
    const [file] = fs.readdirSync(logDir);
    expect(file).toMatch(/^\d{4}-\d{2}-\d{2}\.log$/);
    const messages = fs
      .readFileSync(path.join(logDir, file ?? ""), "utf8")
      .trimEnd()
      .split("\n")
      .map((line) => (JSON.parse(line) as { msg: string }).msg);
    expect(messages[0]).toBe("Server starting");
    expect(messages).toContain("Migration applied");
  });

  it("logs the shutdown signal", async () => {
    const server = startServer();
    await waitFor(() => server.output().includes("Server listening"));

    child?.kill("SIGTERM");
    await server.exited;

    expect(server.output()).toMatch(/^\S+ INFO {2}Received SIGTERM, shutting down signal=SIGTERM$/m);
  });

  it("exits with code 1 on an unknown LOG_LEVEL, listing the valid levels", async () => {
    const server = startServer({ LOG_LEVEL: "verbose" });

    expect(await server.exited).toBe(1);
    expect(server.output()).toMatch(/ERROR Server failed to start\./);
    expect(server.output()).toContain('LOG_LEVEL must be one of debug, info, warn, error, got "verbose"');
  });
});
