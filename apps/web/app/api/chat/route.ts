import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { CHAT_MODEL, buildSessionSystemPrompt } from "@/lib/ai";
import {
  getOrCreateActiveSession,
  getSession,
  listCaptures,
  insertMessage,
} from "@/lib/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    messages: UIMessage[];
    sessionId?: string;
  };

  const session = body.sessionId
    ? getSession(body.sessionId) ?? getOrCreateActiveSession()
    : getOrCreateActiveSession();

  const captures = listCaptures(session.id);
  const system = buildSessionSystemPrompt({
    sessionTitle: session.title,
    topic: session.topic,
    captures,
  });

  const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
  if (lastUser) {
    const text = lastUser.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n");
    if (text.trim()) {
      insertMessage({ sessionId: session.id, role: "user", content: text });
    }
  }

  const result = streamText({
    model: CHAT_MODEL,
    system,
    messages: await convertToModelMessages(body.messages),
    onFinish: ({ text }) => {
      if (text.trim()) {
        insertMessage({
          sessionId: session.id,
          role: "assistant",
          content: text,
        });
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
