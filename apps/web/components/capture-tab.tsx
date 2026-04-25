"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Session, Capture } from "@/lib/schema";
import {
  saveNote,
  saveScreenshot,
  saveDroppedFile,
  registerScreenshotPath,
} from "@/lib/actions";

type CaptureRow = Capture & { _local?: boolean };

export function CaptureTab({
  session,
  initialCaptures,
}: {
  session: Session;
  initialCaptures: Capture[];
}) {
  const [captures, setCaptures] = useState<CaptureRow[]>(initialCaptures);
  const [note, setNote] = useState("");
  const [recording, setRecording] = useState(false);
  const [isPending, startTransition] = useTransition();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // HTML5 drag-and-drop fallback. Tauri's native drop also works (see lib.rs).
  useEffect(() => {
    const el = dropZoneRef.current;
    if (!el) return;
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      setDragOver(true);
    };
    const onDragLeave = () => setDragOver(false);
    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      for (const f of files) {
        await uploadDroppedFile(f);
      }
    };
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, []);

  async function uploadDroppedFile(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await saveDroppedFile(session.id, fd);
      setCaptures((prev) => [
        ...prev,
        {
          id: res.id,
          sessionId: session.id,
          kind: "file",
          content: file.name,
          transcript: null,
          filePath: res.filePath,
          fileMime: file.type || null,
          createdAt: new Date(),
        } as CaptureRow,
      ]);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function takeScreenshot() {
    setError(null);
    try {
      // Call Tauri command if available, otherwise prompt browser screenshot.
      const tauri = (window as unknown as TauriWindow).__TAURI__;
      if (tauri?.core?.invoke) {
        const filePath = await tauri.core.invoke<string>("capture_screenshot");
        const saved = await registerScreenshotPath(session.id, filePath, "image/png");
        setCaptures((prev) => [
          ...prev,
          {
            id: saved.id,
            sessionId: session.id,
            kind: "screenshot",
            content: null,
            transcript: null,
            filePath: saved.filePath,
            fileMime: "image/png",
            createdAt: new Date(),
          } as CaptureRow,
        ]);
      } else {
        // Browser fallback (dev without Tauri): prompt for a file via input.
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async () => {
          const f = input.files?.[0];
          if (!f) return;
          const fd = new FormData();
          fd.append("file", f);
          const saved = await saveScreenshot(session.id, fd);
          setCaptures((prev) => [
            ...prev,
            {
              id: saved.id,
              sessionId: session.id,
              kind: "screenshot",
              content: null,
              transcript: null,
              filePath: saved.filePath,
              fileMime: f.type,
              createdAt: new Date(),
            } as CaptureRow,
          ]);
        };
        input.click();
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await uploadVoice(blob);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  async function uploadVoice(blob: Blob) {
    const fd = new FormData();
    fd.append("audio", new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" }));
    fd.append("sessionId", session.id);
    try {
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = (await res.json()) as {
        id: string;
        filePath: string;
        transcript: string;
      };
      setCaptures((prev) => [
        ...prev,
        {
          id: data.id,
          sessionId: session.id,
          kind: "voice",
          content: null,
          transcript: data.transcript,
          filePath: data.filePath,
          fileMime: "audio/webm",
          createdAt: new Date(),
        } as CaptureRow,
      ]);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function submitNote() {
    if (!note.trim()) return;
    const text = note;
    setNote("");
    startTransition(async () => {
      const cap = await saveNote(session.id, text);
      setCaptures((prev) => [...prev, cap as CaptureRow]);
    });
  }

  return (
    <div
      ref={dropZoneRef}
      className={`flex flex-col h-full ${
        dragOver ? "ring-2 ring-[var(--color-accent)] ring-inset" : ""
      }`}
    >
      <div className="grid grid-cols-2 gap-2 p-3 border-b border-[var(--color-border)]">
        <button
          type="button"
          onClick={takeScreenshot}
          className="px-3 py-2 rounded-md bg-[var(--color-bg-elev)] hover:bg-[var(--color-border)] text-[12px] font-medium"
        >
          Screenshot
        </button>
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          className={`px-3 py-2 rounded-md text-[12px] font-medium flex items-center justify-center gap-2 ${
            recording
              ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
              : "bg-[var(--color-bg-elev)] hover:bg-[var(--color-border)]"
          }`}
        >
          {recording && <span className="size-2 rounded-full bg-red-400 recording-dot" />}
          {recording ? "Stop" : "Record voice"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {captures.length === 0 ? (
          <p className="text-[12px] text-[var(--color-fg-muted)] mt-8 text-center">
            Drop files here, take a screenshot, record a note, or write below.
          </p>
        ) : (
          captures.map((c) => <CaptureRowItem key={c.id} capture={c} />)
        )}
        {error && (
          <p className="text-[11px] text-red-400 px-2 py-1 bg-red-500/10 rounded">{error}</p>
        )}
      </div>

      <div className="p-2 border-t border-[var(--color-border)] flex gap-2">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submitNote();
            }
          }}
          placeholder="Quick note…"
          className="flex-1 px-3 py-1.5 rounded-md bg-[var(--color-bg-elev)] border border-[var(--color-border)] text-[12px] focus:outline-none focus:border-[var(--color-accent)]"
        />
        <button
          type="button"
          onClick={submitNote}
          disabled={isPending || !note.trim()}
          className="px-3 py-1.5 rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)] text-[12px] font-medium disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function CaptureRowItem({ capture }: { capture: Capture }) {
  const ts = new Date(capture.createdAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)]/60 p-2">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-fg-muted)]">
          {capture.kind}
        </span>
        <span className="text-[10px] text-[var(--color-fg-muted)]">{ts}</span>
      </div>
      {capture.kind === "note" && (
        <p className="text-[12px] whitespace-pre-wrap">{capture.content}</p>
      )}
      {capture.kind === "voice" && (
        <p className="text-[12px] text-[var(--color-fg-muted)] italic">
          {capture.transcript || "(transcribing…)"}
        </p>
      )}
      {capture.kind === "screenshot" && (
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

type TauriWindow = {
  __TAURI__?: {
    core?: {
      invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T>;
    };
  };
};
