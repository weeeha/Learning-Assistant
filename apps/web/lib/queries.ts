import "server-only";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { sessions, captures, messages } from "./schema";

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
function endOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}

export function getOrCreateActiveSession(): typeof sessions.$inferSelect {
  const db = getDb();
  const now = new Date();
  const existing = db
    .select()
    .from(sessions)
    .where(
      and(
        gte(sessions.startedAt, startOfDay(now)),
        lte(sessions.startedAt, endOfDay(now))
      )
    )
    .orderBy(desc(sessions.startedAt))
    .limit(1)
    .get();

  if (existing) return existing;

  const id = randomUUID();
  const title = `Session ${now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })}`;
  db.insert(sessions).values({ id, title, startedAt: now }).run();
  return db.select().from(sessions).where(eq(sessions.id, id)).get()!;
}

export function listSessions(limit = 50) {
  const db = getDb();
  return db.select().from(sessions).orderBy(desc(sessions.startedAt)).limit(limit).all();
}

export function getSession(id: string) {
  const db = getDb();
  return db.select().from(sessions).where(eq(sessions.id, id)).get();
}

export function listCaptures(sessionId: string) {
  const db = getDb();
  return db
    .select()
    .from(captures)
    .where(eq(captures.sessionId, sessionId))
    .orderBy(captures.createdAt)
    .all();
}

export function listMessages(sessionId: string) {
  const db = getDb();
  return db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(messages.createdAt)
    .all();
}

export function insertCapture(input: {
  sessionId: string;
  kind: "screenshot" | "voice" | "file" | "note";
  content?: string | null;
  transcript?: string | null;
  filePath?: string | null;
  fileMime?: string | null;
}) {
  const db = getDb();
  const id = randomUUID();
  db.insert(captures).values({ id, ...input }).run();
  return db.select().from(captures).where(eq(captures.id, id)).get()!;
}

export function insertMessage(input: {
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
}) {
  const db = getDb();
  const id = randomUUID();
  db.insert(messages).values({ id, ...input }).run();
  return db.select().from(messages).where(eq(messages.id, id)).get()!;
}

export function newSession(title?: string, topic?: string) {
  const db = getDb();
  const id = randomUUID();
  const now = new Date();
  db.insert(sessions)
    .values({
      id,
      title: title ?? `Session ${now.toLocaleString()}`,
      topic: topic ?? null,
      startedAt: now,
    })
    .run();
  return db.select().from(sessions).where(eq(sessions.id, id)).get()!;
}

export function renameSession(id: string, title: string, topic?: string | null) {
  const db = getDb();
  db.update(sessions)
    .set({ title, ...(topic !== undefined ? { topic } : {}) })
    .where(eq(sessions.id, id))
    .run();
}
