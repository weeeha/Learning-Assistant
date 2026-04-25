import path from "node:path";
import os from "node:os";
import fs from "node:fs";

/**
 * Resolves the app data directory. Tauri sets LA_DATA_DIR when launching the
 * sidecar; outside of Tauri (e.g. plain `next dev`) we fall back to the macOS
 * Application Support location so both modes share the same DB and files.
 */
export function getDataDir(): string {
  const dir =
    process.env.LA_DATA_DIR ??
    path.join(os.homedir(), "Library", "Application Support", "LearningAssistant");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getDbPath(): string {
  return path.join(getDataDir(), "db.sqlite");
}

export function getCapturesDir(): string {
  const dir = path.join(getDataDir(), "captures");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getMigrationsDir(): string {
  return path.join(process.cwd(), "drizzle");
}
