"use client";

import { useState, useTransition } from "react";
import type { Session, Capture, Message } from "@/lib/schema";
import { startNewSession, updateSession } from "@/lib/actions";

export function MainView({
  sessions,
  selected,
  captures,
  messages,
}: {
  sessions: Session[];
  selected: Session;
  captures: Capture[];
  messages: Message[];
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(selected.title);
  const [topic, setTopic] = useState(selected.topic ?? "");

  function newSession() {
    startTransition(async () => {
      const s = await startNewSession();
      window.location.href = `/main?session=${s.id}`;
    });
  }

  function save() {
    startTransition(async () => {
      await updateSession(selected.id, title, topic || null);
      setEditing(false);
    });
  }

  return (
    <main className="flex h-dvh w-dvw bg-[var(--color-bg)] text-[var(--color-fg)]">
      <aside className="w-72 shrink-0 border-r border-[var(--color-border)] flex flex-col">
        <div className="p-3 border-b border-[var(--color-border)]">
          <button
            type="button"
            onClick={newSession}
            disabled={isPending}
            className="w-full px-3 py-2 rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)] text-[13px] font-medium"
          >
            + New session
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map((s) => (
            <a
              key={s.id}
              href={`/main?session=${s.id}`}
              className={`block px-3 py-2 rounded-md text-[13px] border ${
                s.id === selected.id
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                  : "border-transparent hover:bg-[var(--color-bg-elev)]"
              }`}
            >
              <div className="font-medium truncate">{s.title}</div>
              <div className="text-[11px] text-[var(--color-fg-muted)] mt-0.5">
                {new Date(s.startedAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {s.topic ? ` · ${s.topic}` : ""}
              </div>
            </a>
          ))}
        </div>
      </aside>

      <section className="flex-1 min-w-0 flex flex-col">
        <header className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between gap-4">
          {editing ? (
            <div className="flex-1 grid grid-cols-2 gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="px-3 py-1.5 rounded-md bg-[var(--color-bg-elev)] border border-[var(--color-border)] text-[14px]"
                placeholder="Title"
              />
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="px-3 py-1.5 rounded-md bg-[var(--color-bg-elev)] border border-[var(--color-border)] text-[14px]"
                placeholder="Topic (e.g. 3D modeling in Blender)"
              />
            </div>
          ) : (
            <div className="min-w-0">
              <h1 className="text-[18px] font-semibold truncate">{selected.title}</h1>
              <p className="text-[12px] text-[var(--color-fg-muted)] truncate">
                {selected.topic ?? "No topic set"}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => (editing ? save() : setEditing(true))}
            disabled={isPending}
            className="px-3 py-1.5 rounded-md bg-[var(--color-bg-elev)] hover:bg-[var(--color-border)] text-[12px]"
          >
            {editing ? "Save" : "Edit"}
          </button>
        </header>

        <div className="flex-1 min-h-0 grid grid-cols-2 gap-0">
          <div className="overflow-y-auto p-6 border-r border-[var(--color-border)]">
            <h2 className="text-[12px] uppercase tracking-wider text-[var(--color-fg-muted)] mb-3">
              Captures · {captures.length}
            </h2>
            <div className="space-y-3">
              {captures.length === 0 && (
                <p className="text-[13px] text-[var(--color-fg-muted)]">No captures yet.</p>
              )}
              {captures.map((c) => (
                <CaptureCard key={c.id} capture={c} />
              ))}
            </div>
          </div>
          <div className="overflow-y-auto p-6">
            <h2 className="text-[12px] uppercase tracking-wider text-[var(--color-fg-muted)] mb-3">
              Conversation · {messages.length}
            </h2>
            <div className="space-y-3">
              {messages.length === 0 && (
                <p className="text-[13px] text-[var(--color-fg-muted)]">No chat yet.</p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg p-3 text-[13px] whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/40 ml-8"
                      : "bg-[var(--color-bg-elev)] border border-[var(--color-border)] mr-8"
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wider text-[var(--color-fg-muted)] mb-1">
                    {m.role}
                  </div>
                  {m.content}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function CaptureCard({ capture }: { capture: Capture }) {
  const ts = new Date(capture.createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)]/60 p-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-fg-muted)]">
          {capture.kind}
        </span>
        <span className="text-[10px] text-[var(--color-fg-muted)]">{ts}</span>
      </div>
      {capture.kind === "note" && (
        <p className="text-[13px] whitespace-pre-wrap">{capture.content}</p>
      )}
      {capture.kind === "voice" && (
        <p className="text-[13px] italic text-[var(--color-fg-muted)]">
          {capture.transcript || "(no transcript)"}
        </p>
      )}
      {capture.kind === "screenshot" && capture.filePath && (
        <p className="text-[11px] text-[var(--color-fg-muted)] truncate">
          {capture.filePath}
        </p>
      )}
      {capture.kind === "file" && (
        <p className="text-[11px] text-[var(--color-fg-muted)] truncate">
          {capture.content ?? capture.filePath}
        </p>
      )}
    </div>
  );
}
