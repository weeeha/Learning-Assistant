import { defineConfig } from "drizzle-kit";
import path from "node:path";
import os from "node:os";

const dataDir =
  process.env.LA_DATA_DIR ??
  path.join(os.homedir(), "Library", "Application Support", "LearningAssistant");

export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: path.join(dataDir, "db.sqlite"),
  },
});
