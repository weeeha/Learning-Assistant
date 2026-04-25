"use server";

import { revalidatePath } from "next/cache";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { getCapturesDir } from "./paths";
import {
  getOrCreateActiveSession,
  insertCapture,
  newSession as newSessionQuery,
  renameSession as renameSessionQuery,
} from "./queries";

export async function ensureActiveSession() {
  const session = getOrCreateActiveSession();
  return session;
}

export async function startNewSession(title?: string, topic?: string) {
  const session = newSessionQuery(title, topic);
  revalidatePath("/main");
  revalidatePath("/panel");
  return session;
}

export async function updateSession(
  id: string,
  title: string,
  topic: string | null
) {
  renameSessionQuery(id, title, topic);
  revalidatePath("/main");
}

export async function saveNote(sessionId: string, content: string) {
  const cap = insertCapture({ sessionId, kind: "note", content });
  revalidatePath("/main");
  revalidatePath("/panel");
  return cap;
}

export async function saveScreenshot(
  sessionId: string,
  formData: FormData
): Promise<{ id: string; filePath: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Missing screenshot file");
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || ".png";
  const id = randomUUID();
  const filePath = path.join(getCapturesDir(), `${id}${ext}`);
  await fs.writeFile(filePath, buf);
  const cap = insertCapture({
    sessionId,
    kind: "screenshot",
    filePath,
    fileMime: file.type || "image/png",
  });
  revalidatePath("/main");
  revalidatePath("/panel");
  return { id: cap.id, filePath };
}

/**
 * Register a screenshot already written to disk by the Tauri Rust side.
 * Avoids round-tripping the bytes through the webview.
 */
export async function registerScreenshotPath(
  sessionId: string,
  filePath: string,
  mime: string = "image/png"
): Promise<{ id: string; filePath: string }> {
  if (!filePath) throw new Error("filePath required");
  const cap = insertCapture({
    sessionId,
    kind: "screenshot",
    filePath,
    fileMime: mime,
  });
  revalidatePath("/main");
  revalidatePath("/panel");
  return { id: cap.id, filePath };
}

export async function saveDroppedFile(
  sessionId: string,
  formData: FormData
): Promise<{ id: string; filePath: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Missing file");
  const buf = Buffer.from(await file.arrayBuffer());
  const id = randomUUID();
  const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
  const filePath = path.join(getCapturesDir(), `${id}-${safeName}`);
  await fs.writeFile(filePath, buf);
  const cap = insertCapture({
    sessionId,
    kind: "file",
    content: file.name,
    filePath,
    fileMime: file.type || "application/octet-stream",
  });
  revalidatePath("/main");
  revalidatePath("/panel");
  return { id: cap.id, filePath };
}
