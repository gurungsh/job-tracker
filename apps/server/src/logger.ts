import { AsyncLocalStorage } from "node:async_hooks";
import fs from "node:fs";
import path from "node:path";
import { LOG_LEVELS, type LogLevel } from "@job-tracker/shared";
import { localDate } from "./localDate.ts";

export type LogFields = Record<string, unknown>;

/** One log line, as written to the JSON log file. */
export type LogEntry = { time: string; level: LogLevel; msg: string; requestId?: string } & LogFields;

export type Logger = Record<LogLevel, (message: string, fields?: LogFields) => void> & {
  /** The lowest level that's written. */
  readonly level: LogLevel;
};

export type LoggerOptions = {
  level: LogLevel;
  /** The folder for daily JSON log files. Leave it out to log to the terminal only. */
  logDir?: string | undefined;
  /** Receives each readable line. Defaults to stdout, or stderr for warn and error. */
  terminal?: (line: string, entry: LogEntry) => void;
  now?: () => Date;
};

const requestContext = new AsyncLocalStorage<string>();

/** Runs `fn` so that every line it logs, even deep inside, carries `requestId` (spec 004, AC-15). */
export function runWithRequestId<T>(requestId: string, fn: () => T): T {
  return requestContext.run(requestId, fn);
}

export function createLogger({ level, logDir, terminal = writeToTerminal, now = () => new Date() }: LoggerOptions): Logger {
  const minimum = LOG_LEVELS.indexOf(level);

  function log(entryLevel: LogLevel, message: string, fields: LogFields = {}): void {
    if (LOG_LEVELS.indexOf(entryLevel) < minimum) return;

    const date = now();
    const requestId = requestContext.getStore();
    const entry: LogEntry = {
      time: localTimestamp(date),
      level: entryLevel,
      msg: message,
      ...(requestId === undefined ? {} : { requestId }),
      ...serializeFields(fields),
    };

    terminal(formatLine(entry), entry);
    if (logDir !== undefined) writeToFile(logDir, localDate(date, undefined), entry);
  }

  let currentDay: string | undefined;
  let warned = false;

  /** Appends to the day's file. A failure warns once in the terminal, and later lines try again. */
  function writeToFile(dir: string, day: string, entry: LogEntry): void {
    try {
      if (day !== currentDay) {
        fs.mkdirSync(dir, { recursive: true });
        removeOldLogFiles(dir, day);
        currentDay = day;
      }
      fs.appendFileSync(path.join(dir, `${day}.log`), `${JSON.stringify(entry)}\n`);
      warned = false;
    } catch (error) {
      if (warned) return;
      warned = true;
      currentDay = undefined;
      if (LOG_LEVELS.indexOf("warn") < minimum) return;
      const warning: LogEntry = {
        time: localTimestamp(now()),
        level: "warn",
        msg: "Can't write log files, so logging to the terminal only",
        logDir: dir,
        error: serializeValue(error),
      };
      terminal(formatLine(warning), warning);
    }
  }

  // Clean up at startup, and create the folder (spec 004, AC-9, edge cases).
  if (logDir !== undefined) {
    try {
      fs.mkdirSync(logDir, { recursive: true });
      const today = localDate(now(), undefined);
      removeOldLogFiles(logDir, today);
      currentDay = today;
    } catch {
      // The first line written will try again and warn.
    }
  }

  return {
    level,
    debug: (message, fields) => {
      log("debug", message, fields);
    },
    info: (message, fields) => {
      log("info", message, fields);
    },
    warn: (message, fields) => {
      log("warn", message, fields);
    },
    error: (message, fields) => {
      log("error", message, fields);
    },
  };
}

/** A logger that writes nothing, for tests that don't check logging. */
export const silentLogger: Logger = createLogger({ level: "info", terminal: () => undefined });

/** Days of log files to keep, including today (spec 004, AC-9). */
const KEEP_DAYS = 7;
const LOG_FILE = /^(\d{4}-\d{2}-\d{2})\.log$/;

/** Deletes dated log files older than KEEP_DAYS. Other files in the folder are left alone. */
export function removeOldLogFiles(dir: string, today: string): void {
  const oldest = new Date(`${today}T00:00:00Z`);
  oldest.setUTCDate(oldest.getUTCDate() - (KEEP_DAYS - 1));
  const cutoff = oldest.toISOString().slice(0, 10);

  for (const name of fs.readdirSync(dir)) {
    const day = LOG_FILE.exec(name)?.[1];
    if (day !== undefined && day < cutoff) fs.rmSync(path.join(dir, name), { force: true });
  }
}

function writeToTerminal(line: string, entry: LogEntry): void {
  const stream = entry.level === "warn" || entry.level === "error" ? process.stderr : process.stdout;
  stream.write(`${line}\n`);
}

/** ISO 8601 with milliseconds and the local offset, such as 2026-10-01T22:42:14.123-07:00. */
export function localTimestamp(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const shifted = new Date(date.getTime() + offsetMinutes * 60_000);
  const sign = offsetMinutes < 0 ? "-" : "+";
  const absolute = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const minutes = String(absolute % 60).padStart(2, "0");
  return `${shifted.toISOString().slice(0, -1)}${sign}${hours}:${minutes}`;
}

function serializeFields(fields: LogFields): LogFields {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, serializeValue(value)]));
}

function serializeValue(value: unknown): unknown {
  if (!(value instanceof Error)) return value;
  return {
    name: value.name,
    message: value.message,
    stack: value.stack,
    ...(value.cause === undefined ? {} : { cause: serializeValue(value.cause) }),
  };
}

/** Request lines already say these in their message, so the terminal leaves them out. */
const SHOWN_IN_MESSAGE = new Set(["method", "path", "status", "durationMs"]);

/** A readable line: time, level, message, then key=value pairs, with stack traces on the lines after. */
export function formatLine(entry: LogEntry): string {
  const { time, level, msg, requestId, ...fields } = entry;
  const pairs: string[] = [];
  const trailing: string[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (SHOWN_IN_MESSAGE.has(key) || value === undefined) continue;
    if (key === "stack" && typeof value === "string") {
      trailing.push(value);
    } else if (isSerializedError(value)) {
      trailing.push(errorText(value));
    } else {
      pairs.push(`${key}=${formatValue(value)}`);
    }
  }
  if (requestId !== undefined) pairs.push(`id=${requestId.slice(0, 8)}`);

  const head = [time, level.toUpperCase().padEnd(5), msg, ...pairs].join(" ");
  return [head, ...trailing.map(indent)].join("\n");
}

type SerializedError = { name: string; message: string; stack?: string | undefined; cause?: unknown };

function isSerializedError(value: unknown): value is SerializedError {
  return typeof value === "object" && value !== null && "name" in value && "message" in value && "stack" in value;
}

function errorText(error: SerializedError): string {
  const text = error.stack ?? `${error.name}: ${error.message}`;
  return isSerializedError(error.cause) ? `${text}\nCaused by: ${errorText(error.cause)}` : text;
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return /^[^\s"=]+$/.test(value) ? value : JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return String(value);
  return JSON.stringify(value);
}

function indent(text: string): string {
  return text
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
}
