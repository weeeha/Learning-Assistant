import { ensureActiveSession } from "@/lib/actions";
import { listCaptures, listMessages, listSessions } from "@/lib/queries";
import { PanelTabs } from "@/components/panel-tabs";

export const dynamic = "force-dynamic";

export default async function PanelPage() {
  const session = await ensureActiveSession();
  const captures = listCaptures(session.id);
  const messages = listMessages(session.id);
  const recent = listSessions(8);

  return (
    <main className="h-dvh w-dvw overflow-hidden bg-[var(--color-bg-panel)] backdrop-blur-xl text-[var(--color-fg)] flex flex-col">
      <header
        data-tauri-drag-region
        className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] select-none"
      >
        <div data-tauri-drag-region className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-[var(--color-accent)]" />
          <span data-tauri-drag-region className="text-[13px] font-medium truncate max-w-[220px]">
            {session.title}
          </span>
        </div>
        <span className="text-[11px] text-[var(--color-fg-muted)]" data-tauri-drag-region>
          ⌘⇧L
        </span>
      </header>
      <PanelTabs
        session={session}
        initialCaptures={captures}
        initialMessages={messages}
        recentSessions={recent}
      />
    </main>
  );
}
