import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { localDate } from "./localDate.ts";
import { createLogger, formatLine, type LogEntry, localTimestamp, runWithRequestId } from "./logger.ts";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-tracker-logger-"));
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

const fixedNow = new Date("2026-10-01T17:42:14.123Z");

function setup(level: "debug" | "info" | "warn" | "error" = "debug") {
  const lines: string[] = [];
  const logDir = path.join(tempDir, "logs");
  const logger = createLogger({
    level,
    logDir,
    now: () => fixedNow,
    terminal: (line) => {
      lines.push(line);
    },
  });
  const fileEntries = (): LogEntry[] => {
    const file = path.join(logDir, `${localDate(fixedNow, undefined)}.log`);
    if (!fs.existsSync(file)) return [];
    return fs
      .readFileSync(file, "utf8")
      .trimEnd()
      .split("\n")
      .map((line) => JSON.parse(line) as LogEntry);
  };
  return { logger, lines, fileEntries };
}

describe("createLogger", () => {
  it("writes the same entry to the terminal as a readable line and to the day's file as JSON", () => {
    const { logger, lines, fileEntries } = setup();

    logger.info("Server starting", { port: 3000, databasePath: "/data/job tracker.db" });

    expect(fileEntries()).toEqual([
      {
        time: localTimestamp(fixedNow),
        level: "info",
        msg: "Server starting",
        port: 3000,
        databasePath: "/data/job tracker.db",
      },
    ]);
    expect(lines).toEqual([`${localTimestamp(fixedNow)} INFO  Server starting port=3000 databasePath="/data/job tracker.db"`]);
  });

  it.each([
    ["debug", ["debug", "info", "warn", "error"]],
    ["info", ["info", "warn", "error"]],
    ["warn", ["warn", "error"]],
    ["error", ["error"]],
  ] as const)("at %s, writes only that level and above, to both outputs", (level, written) => {
    const { logger, lines, fileEntries } = setup(level);

    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");

    expect(fileEntries().map((entry) => entry.level)).toEqual(written);
    expect(lines).toHaveLength(written.length);
    expect(logger.level).toBe(level);
  });

  it("adds the request ID inside runWithRequestId, including across awaits, and not outside it", async () => {
    const { logger, lines, fileEntries } = setup();
    const requestId = "3f2a9c1e-0000-4000-8000-000000000000";

    await runWithRequestId(requestId, async () => {
      logger.info("before");
      await new Promise((resolve) => setTimeout(resolve, 1));
      logger.info("after");
    });
    logger.info("outside");

    expect(fileEntries().map((entry) => entry.requestId)).toEqual([requestId, requestId, undefined]);
    expect(lines[0]).toMatch(/ before id=3f2a9c1e$/);
    expect(lines[2]).not.toMatch(/id=/);
  });

  it("serializes errors, with their cause, and prints stack traces on the following lines", () => {
    const { logger, lines, fileEntries } = setup();
    const error = new Error("Migration failed", { cause: new TypeError("bad SQL") });

    logger.error("Server failed to start", { error });

    const [entry] = fileEntries();
    expect(entry?.error).toMatchObject({
      name: "Error",
      message: "Migration failed",
      stack: expect.stringContaining("Migration failed") as unknown,
      cause: { name: "TypeError", message: "bad SQL" },
    });
    const [line] = lines;
    expect(line?.split("\n")[0]).toBe(`${localTimestamp(fixedNow)} ERROR Server failed to start`);
    expect(line).toContain("\n    Error: Migration failed");
    expect(line).toContain("Caused by: TypeError: bad SQL");
  });
});

describe("formatLine", () => {
  const time = "2026-10-01T22:42:14.123-07:00";

  it("leaves request fields out, since the message already says them", () => {
    expect(
      formatLine({
        time,
        level: "warn",
        msg: "GET /api/nope 404 3ms",
        requestId: "3f2a9c1e-aaaa",
        method: "GET",
        path: "/api/nope",
        status: 404,
        durationMs: 3,
      }),
    ).toBe(`${time} WARN  GET /api/nope 404 3ms id=3f2a9c1e`);
  });

  it("quotes text with spaces, writes objects as JSON, and puts a browser stack on the next lines", () => {
    expect(
      formatLine({
        time,
        level: "error",
        msg: "Boom",
        source: "browser",
        page: "http://localhost:5173/?a=b c",
        api: { method: "GET", status: 0 },
        stack: "Error: Boom\n    at x.js:1:1",
      }),
    ).toBe(
      `${time} ERROR Boom source=browser page="http://localhost:5173/?a=b c" api={"method":"GET","status":0}\n` +
        "    Error: Boom\n        at x.js:1:1",
    );
  });
});

describe("localTimestamp", () => {
  it("is ISO 8601 with milliseconds and the local offset, for the same instant", () => {
    const stamp = localTimestamp(fixedNow);

    expect(stamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/);
    expect(Date.parse(stamp)).toBe(fixedNow.getTime());
  });
});

describe("daily log files", () => {
  function clockedLogger(start: Date, logDir = path.join(tempDir, "logs")) {
    let current = start;
    const lines: string[] = [];
    const logger = createLogger({
      level: "debug",
      logDir,
      now: () => current,
      terminal: (line) => {
        lines.push(line);
      },
    });
    const setNow = (date: Date) => {
      current = date;
    };
    return { logger, lines, logDir, setNow };
  }

  const fileNames = (dir: string) => fs.readdirSync(dir).sort();
  const messagesIn = (dir: string, day: string) =>
    fs
      .readFileSync(path.join(dir, `${day}.log`), "utf8")
      .trimEnd()
      .split("\n")
      .map((line) => (JSON.parse(line) as LogEntry).msg);

  it("starts a new file for each local day, leaving the previous day's file complete", () => {
    const beforeMidnight = new Date(2026, 9, 1, 23, 59, 59);
    const afterMidnight = new Date(2026, 9, 2, 0, 0, 1);
    const { logger, logDir, setNow } = clockedLogger(beforeMidnight);

    logger.info("late");
    setNow(afterMidnight);
    logger.info("early");

    expect(fileNames(logDir)).toEqual(["2026-10-01.log", "2026-10-02.log"]);
    expect(messagesIn(logDir, "2026-10-01")).toEqual(["late"]);
    expect(messagesIn(logDir, "2026-10-02")).toEqual(["early"]);
  });

  it("keeps 7 days including today, at startup and when the day changes, and leaves other files alone", () => {
    const logDir = path.join(tempDir, "logs");
    fs.mkdirSync(logDir);
    for (let day = 1; day <= 10; day++) {
      fs.writeFileSync(path.join(logDir, `2026-10-${String(day).padStart(2, "0")}.log`), "{}\n");
    }
    fs.writeFileSync(path.join(logDir, "notes.txt"), "mine");
    fs.writeFileSync(path.join(logDir, "2026-09-01.log.bak"), "mine");

    const { logger, setNow } = clockedLogger(new Date(2026, 9, 10, 12), logDir);

    expect(fileNames(logDir)).toEqual([
      "2026-09-01.log.bak",
      "2026-10-04.log",
      "2026-10-05.log",
      "2026-10-06.log",
      "2026-10-07.log",
      "2026-10-08.log",
      "2026-10-09.log",
      "2026-10-10.log",
      "notes.txt",
    ]);

    setNow(new Date(2026, 9, 11, 0, 5));
    logger.info("next day");

    expect(fileNames(logDir)).not.toContain("2026-10-04.log");
    expect(fileNames(logDir)).toContain("2026-10-11.log");
    expect(fileNames(logDir).filter((name) => name.endsWith(".log"))).toHaveLength(7);
    expect(fileNames(logDir)).toContain("notes.txt");
  });

  it("warns once and keeps logging to the terminal when the folder can't be written, then recovers", () => {
    const blocked = path.join(tempDir, "logs");
    fs.writeFileSync(blocked, "a file where the folder should be");
    const { logger, lines } = clockedLogger(new Date(2026, 9, 1, 12), blocked);

    logger.info("one");
    logger.info("two");

    expect(lines.filter((line) => line.includes("Can't write log files"))).toHaveLength(1);
    expect(lines.filter((line) => / INFO {2}(one|two)$/.test(line))).toHaveLength(2);

    fs.rmSync(blocked);
    logger.info("three");

    expect(messagesIn(blocked, "2026-10-01")).toEqual(["three"]);
  });
});
