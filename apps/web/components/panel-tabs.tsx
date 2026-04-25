"use client";

import { useState } from "react";
import type { Session, Capture, Message } from "@/lib/schema";
import { CaptureTab } from "./capture-tab";
import { ChatTab } from "./chat-tab";
import { SessionsTab } from "./sessions-tab";

type Tab = "capture" | "chat" | "sessions";

const TABS: { id: Tab; label: string }[] = [
  { id: "capture", label: "Capture" },
  { id: "chat", label: "Chat" },
  { id: "sessions", label: "Sessions" },
];

export function PanelTabs({
  session,
  initialCaptures,
  initialMessages,
  recentSessions,
}: {
  session: Session;
  initialCaptures: Capture[];
  initialMessages: Message[];
  recentSessions: Session[];
}) {
  const [tab, setTab] = useState<Tab>("capture");

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <nav className="flex border-b border-[var(--color-border)] bg-[var(--color-bg)]/40">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-2 text-[12px] font-medium transition-colors ${
              tab === t.id
                ? "text-[var(--color-accent)] border-b-2 border-[var(--color-accent)] -mb-px"
                : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === "capture" && (
          <CaptureTab session={session} initialCaptures={initialCaptures} />
        )}
        {tab === "chat" && (
          <ChatTab session={session} initialMessages={initialMessages} />
        )}
        {tab === "sessions" && (
          <SessionsTab activeId={session.id} sessions={recentSessions} />
        )}
      </div>
    </div>
  );
}
