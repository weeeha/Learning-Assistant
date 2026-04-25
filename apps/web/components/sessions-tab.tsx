"use client";

import { useTransition } from "react";
import type { Session } from "@/lib/schema";
import { startNewSession } from "@/lib/actions";

export function SessionsTab({
  activeId,
  sessions,
}: {
  activeId: string;
  sessions: Session[];
}) {
  const [isPending, startTransition] = useTransition();

  function openMain(sessionId?: string) {
    const tauri = (window as unknown as TauriWindow).__TAURI__;
    if (tauri?.core?.invoke) {
      tauri.core.invoke("open_main_window", { sessionId }).catch(console.error);
    } else {
      const url = sessionId ? `/main?session=${sessionId}` : "/main";
      window.open(url, "_blank");
    }
  }

  function newSession() {
    startTransition(async () => {
      const s = await startNewSession();
      openMain(s.id);
    });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-[var(--color-border)] flex gap-2">
        <button
          type="button"
          onClick={newSession}
          disabled={isPending}
          className="flex-1 px-3 py-1.5 rounded-md bg-[var(--color-bg-elev)] hover:bg-[var(--color-border)] text-[12px] font-medium"
        >
          New session
        </button>
        <button
          type="button"
          onClick={() => openMain()}
          className="flex-1 px-3 py-1.5 rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)] text-[12px] font-medium"
        >
          Open main
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {sessions.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => openMain(s.id)}
            className={`w-full text-left px-3 py-2 rounded-md text-[12px] border ${
              s.id === activeId
                ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                : "border-[var(--color-border)] bg-[var(--color-bg-elev)]/50 hover:bg-[var(--color-bg-elev)]"
            }`}
          >
            <div className="font-medium truncate">{s.title}</div>
            <div className="text-[10px] text-[var(--color-fg-muted)] mt-0.5">
              {new Date(s.startedAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {s.topic ? ` · ${s.topic}` : ""}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

type TauriWindow = {
  __TAURI__?: {
    core?: {
      invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T>;
    };
  };
};
