# CLAUDE.md — Learning Assistant

This is project-level guidance for Claude Code working in this repo. Read this before starting non-trivial changes.

## What this is

A macOS desktop **Learning Assistant**: a floating Tauri panel + Next.js companion UI that captures screenshots, voice notes, files, and chat with Claude into local learning sessions.

v1 ships floating-panel + chat + manual capture. ScreenPipe integration, auto learning-node extraction, and learning-plan generation are deferred to v2 (see [README.md](README.md) Roadmap).

## Architecture in one screen

```
Tauri 2.x (Rust)  ──HTTP──>  Next.js 16 sidecar  ──>  Vercel AI Gateway
   apps/desktop/                apps/web/                   (Claude / Whisper)
       │                            │
       │                            ▼
       │                       better-sqlite3
       │                            │
       └────────── LA_DATA_DIR ────►│
                                    ▼
       ~/Library/Application Support/LearningAssistant/
           db.sqlite       captures/
```

- The Tauri Rust side owns: window creation, NSPanel-style level/collection-behavior, the `⌘⇧L` global hotkey, and three commands (`capture_screenshot`, `open_main_window`, `toggle_panel`).
- Everything else — chat, transcription, persistence, UI — lives in `apps/web` (Next.js). Both Tauri windows load the same Next.js routes (`/panel`, `/main`).
- The Tauri side passes `LA_DATA_DIR` to the Next.js process so the SQLite DB and capture files live in the OS-resolved app-data dir.

## Where things live

| Area | Path |
|------|------|
| Tauri app entry | [apps/desktop/src-tauri/src/lib.rs](apps/desktop/src-tauri/src/lib.rs) |
| macOS panel styling | [apps/desktop/src-tauri/src/panel_macos.rs](apps/desktop/src-tauri/src/panel_macos.rs) |
| Tauri config / window defs | [apps/desktop/src-tauri/tauri.conf.json](apps/desktop/src-tauri/tauri.conf.json) |
| Tauri permissions | [apps/desktop/src-tauri/capabilities/default.json](apps/desktop/src-tauri/capabilities/default.json) |
| Drizzle schema | [apps/web/lib/schema.ts](apps/web/lib/schema.ts) |
| DB connection / auto-migrate | [apps/web/lib/db.ts](apps/web/lib/db.ts) |
| Path resolution (`LA_DATA_DIR`) | [apps/web/lib/paths.ts](apps/web/lib/paths.ts) |
| Server Actions (note/screenshot/file/session) | [apps/web/lib/actions.ts](apps/web/lib/actions.ts) |
| AI model identifiers + system prompt | [apps/web/lib/ai.ts](apps/web/lib/ai.ts) |
| Streaming chat route | [apps/web/app/api/chat/route.ts](apps/web/app/api/chat/route.ts) |
| Whisper transcription route | [apps/web/app/api/transcribe/route.ts](apps/web/app/api/transcribe/route.ts) |
| Floating-panel UI | [apps/web/app/panel/page.tsx](apps/web/app/panel/page.tsx) + [components/panel-tabs.tsx](apps/web/components/panel-tabs.tsx) |
| Main window UI | [apps/web/app/main/page.tsx](apps/web/app/main/page.tsx) + [components/main-view.tsx](apps/web/components/main-view.tsx) |

## Common commands

```bash
pnpm dev               # Tauri + Next.js (Tauri auto-spawns next dev)
pnpm dev:web           # Next.js only — the floating panel UI runs in a browser tab
pnpm typecheck         # tsc --noEmit on apps/web
pnpm db:generate       # Drizzle: schema.ts → drizzle/*.sql
pnpm db:migrate        # apply migrations to ~/Library/Application Support/LearningAssistant/db.sqlite
cargo check            # in apps/desktop/src-tauri/, validates Rust without linking
```

After changing [schema.ts](apps/web/lib/schema.ts) you **must** run `pnpm db:generate` and then `pnpm db:migrate`. Don't hand-edit the SQL in `apps/web/drizzle/`.

## Conventions

### AI calls — always through the Gateway
- Use plain `"provider/model"` strings (e.g. `"anthropic/claude-sonnet-4-6"`). Never import `@ai-sdk/anthropic` or `@ai-sdk/openai`. The Gateway provides observability, fallbacks, and a single API key.
- Model IDs live in [lib/ai.ts](apps/web/lib/ai.ts) — read from there, don't hardcode in routes.
- `convertToModelMessages` returns a `Promise<ModelMessage[]>` in AI SDK v6 — always `await` it.

### Tauri ↔ webview boundary
- The frontend feature-detects Tauri via `window.__TAURI__?.core?.invoke`. Every Tauri-using component also has a browser fallback so `pnpm dev:web` keeps working — don't remove the fallback when adding a Tauri command.
- When a Rust command writes a file, return its absolute path. Have the frontend call a Server Action (`registerScreenshotPath`-style) to record it in the DB. Don't round-trip the bytes through the webview.
- New Tauri commands need entries in `invoke_handler!` ([lib.rs](apps/desktop/src-tauri/src/lib.rs)) **and** matching permissions in [capabilities/default.json](apps/desktop/src-tauri/capabilities/default.json).

### Storage / paths
- Anything reading or writing files in the app data dir goes through [lib/paths.ts](apps/web/lib/paths.ts) (`getDataDir`, `getCapturesDir`, `getDbPath`). Never hardcode `~/Library/Application Support/...` — Tauri sets `LA_DATA_DIR` to the OS-resolved location, which is the source of truth.
- DB access goes through [lib/db.ts](apps/web/lib/db.ts) (`getDb()`). It auto-runs migrations on first call, lazy-init pattern.

### macOS specifics
- NSPanel-style behavior is in [panel_macos.rs](apps/desktop/src-tauri/src/panel_macos.rs). It sets the window level and collection behavior — that's enough for "floats above app windows + visible across Spaces". Promotion to a true non-activating `NSPanel` (Spotlight semantics) means pulling in `tauri-plugin-nspanel`.
- macOS will prompt for **microphone** permission on first voice-record and **screen recording** permission on first screenshot. The Info.plist usage strings are inherited from Tauri defaults; if the prompts feel off, override in `tauri.conf.json`.

### Code style
- Follow the parent CLAUDE.md instructions (no comments unless WHY is non-obvious; no premature abstractions; no half-finished implementations).
- Server Components by default; mark client components with `"use client"`.
- Server Actions live in [lib/actions.ts](apps/web/lib/actions.ts) with `"use server"` at top. Call `revalidatePath('/panel')` and/or `revalidatePath('/main')` after mutating the DB.

## Known gotchas

- **AI SDK version skew** — `@ai-sdk/react@2.x` pairs with `ai@5`, `@ai-sdk/react@3.x` pairs with `ai@6`. We're on v6 across the board. If you upgrade either, upgrade both.
- **better-sqlite3 build script** — needs to be in the root `pnpm.onlyBuiltDependencies` allowlist or the native binary won't build. Already configured.
- **Production bundling** — `next.config.ts` sets `output: 'standalone'` but `tauri build` is **not yet** wired up to bundle Node + the standalone server as a sidecar. v1 is dev-mode only. When you tackle this, the pattern is: ship a Node binary as a Tauri sidecar, spawn it on app boot, point all windows at `http://127.0.0.1:<port>`.
- **Path with spaces** — the dev path on the original machine is `/Users/nickv/Learning Assistant/`. Cargo and pnpm both handle it fine, but if you ever shell out without quoting paths, you'll get bitten.
- **`.env` location** — Next.js loads env files from `apps/web/.env` (the Next project root), not the workspace root. If you find `AI_GATEWAY_API_KEY` is unset at runtime, that's almost always why.
- **The `nodes` table is empty in v1** — it's reserved for v2's auto-extracted learning nodes. Don't repurpose it.

## When adding a new feature

1. Read the relevant section above and any siblings of the file you're touching.
2. Prefer adding to existing files (especially [actions.ts](apps/web/lib/actions.ts), [queries.ts](apps/web/lib/queries.ts), [ai.ts](apps/web/lib/ai.ts)) over creating new ones.
3. If the feature crosses the Rust/JS boundary: add the Rust command, the capability permission, then call from the frontend with a browser fallback.
4. After schema changes: `pnpm db:generate && pnpm db:migrate`.
5. Run `pnpm typecheck` and (in `apps/desktop/src-tauri`) `cargo check` before declaring done.

## Out of scope unless explicitly requested

- Multi-user / auth — v1 is single-user local.
- Cloud sync — when you need this, swap SQLite → Neon Postgres via Vercel Marketplace.
- Windows / Linux support — v1 is macOS-only because of the NSPanel reliance.
- ScreenPipe wiring — the data model has room for it; integration is a v2 task.
