import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const dataDir =
  process.env.LA_DATA_DIR ??
  path.join(os.homedir(), "Library", "Application Support", "LearningAssistant");
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "db.sqlite");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);
const migrationsFolder = path.resolve(process.cwd(), "drizzle");

console.log("Running migrations from", migrationsFolder, "→", dbPath);
migrate(db, { migrationsFolder });
console.log("Migrations complete.");
sqlite.close();
