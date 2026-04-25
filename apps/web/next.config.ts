import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  // Pin Turbopack's workspace root to this project so it stops picking up an
  // unrelated lockfile from a parent directory (e.g. ~/package-lock.json).
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default config;
