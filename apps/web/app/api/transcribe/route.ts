import { experimental_transcribe as transcribe } from "ai";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { TRANSCRIBE_MODEL } from "@/lib/ai";
import { getCapturesDir } from "@/lib/paths";
import {
  getOrCreateActiveSession,
  getSession,
  insertCapture,
} from "@/lib/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("audio");
  const sessionIdRaw = form.get("sessionId");
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing audio file" }, { status: 400 });
  }

  const session =
    typeof sessionIdRaw === "string" && sessionIdRaw
      ? getSession(sessionIdRaw) ?? getOrCreateActiveSession()
      : getOrCreateActiveSession();

  const buf = Buffer.from(await file.arrayBuffer());
  const ext =
    path.extname(file.name) ||
    (file.type.includes("webm") ? ".webm" : file.type.includes("mp4") ? ".m4a" : ".bin");
  const id = randomUUID();
  const filePath = path.join(getCapturesDir(), `${id}${ext}`);
  await fs.writeFile(filePath, buf);

  let transcript = "";
  try {
    const result = await transcribe({
      model: TRANSCRIBE_MODEL,
      audio: buf,
    });
    transcript = result.text ?? "";
  } catch (err) {
    console.error("[transcribe] failed", err);
    transcript = "";
  }

  const cap = insertCapture({
    sessionId: session.id,
    kind: "voice",
    transcript,
    filePath,
    fileMime: file.type || "audio/webm",
  });

  return Response.json({
    id: cap.id,
    sessionId: session.id,
    filePath,
    transcript,
  });
}
