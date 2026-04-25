/**
 * AI model identifiers for the Vercel AI Gateway.
 *
 * The gateway is implicit — passing a "provider/model" string to AI SDK v6
 * functions like `streamText` / `transcribe` automatically routes through the
 * gateway when AI_GATEWAY_API_KEY is set.
 */

export const CHAT_MODEL =
  process.env.AI_CHAT_MODEL ?? "anthropic/claude-sonnet-4-6";

export const TRANSCRIBE_MODEL =
  process.env.AI_TRANSCRIBE_MODEL ?? "openai/whisper-1";

export function buildSessionSystemPrompt(opts: {
  sessionTitle: string;
  topic: string | null;
  captures: Array<{
    kind: string;
    content: string | null;
    transcript: string | null;
    filePath: string | null;
    createdAt: Date;
  }>;
}) {
  const { sessionTitle, topic, captures } = opts;
  const lines: string[] = [
    "You are the user's Learning Assistant.",
    "You help them capture, structure, and recall what they learn during a session.",
    "Be concise. Reference specific captures by what they contain when relevant.",
    "If asked about something not in the captures, say so plainly rather than guessing.",
    "",
    `Current session: ${sessionTitle}`,
  ];
  if (topic) lines.push(`Topic: ${topic}`);
  lines.push("", "Captures so far (most recent last):");

  if (captures.length === 0) {
    lines.push("(none yet)");
  } else {
    for (const c of captures) {
      const ts = new Date(c.createdAt).toISOString();
      switch (c.kind) {
        case "screenshot":
          lines.push(`- [${ts}] Screenshot: ${c.filePath ?? "(missing)"}`);
          break;
        case "voice":
          lines.push(
            `- [${ts}] Voice note: "${(c.transcript ?? "(no transcript)").slice(0, 500)}"`
          );
          break;
        case "file":
          lines.push(`- [${ts}] File: ${c.filePath ?? "(missing)"}`);
          break;
        case "note":
          lines.push(`- [${ts}] Note: ${(c.content ?? "").slice(0, 500)}`);
          break;
      }
    }
  }

  return lines.join("\n");
}
