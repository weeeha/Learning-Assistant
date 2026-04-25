"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import type { Session, Message } from "@/lib/schema";

export function ChatTab({
  session,
  initialMessages,
}: {
  session: Session;
  initialMessages: Message[];
}) {
  const seeded = useMemo<UIMessage[]>(
    () =>
      initialMessages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          parts: [{ type: "text", text: m.content }],
        })),
    [initialMessages]
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { sessionId: session.id },
      }),
    [session.id]
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: seeded,
  });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function submit() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendMessage({ text });
  }

  const busy = status === "submitted" || status === "streaming";

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-[12px] text-[var(--color-fg-muted)] mt-6 text-center">
            Ask anything about this session — your captures are visible.
          </p>
        )}
        {messages.map((m) => (
          <ChatBubble key={m.id} message={m} />
        ))}
        {busy && (
          <p className="text-[11px] text-[var(--color-fg-muted)] italic">thinking…</p>
        )}
      </div>
      <div className="p-2 border-t border-[var(--color-border)] flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Message your assistant…"
          className="flex-1 px-3 py-1.5 rounded-md bg-[var(--color-bg-elev)] border border-[var(--color-border)] text-[12px] focus:outline-none focus:border-[var(--color-accent)]"
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy || !input.trim()}
          className="px-3 py-1.5 rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)] text-[12px] font-medium disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: UIMessage }) {
  const text = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n");
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-[12px] whitespace-pre-wrap ${
          isUser
            ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
            : "bg-[var(--color-bg-elev)] border border-[var(--color-border)]"
        }`}
      >
        {text}
      </div>
    </div>
  );
}
