import {
  ensureActiveSession,
  startNewSession,
} from "@/lib/actions";
import {
  getSession,
  listCaptures,
  listMessages,
  listSessions,
} from "@/lib/queries";
import { MainView } from "@/components/main-view";

export const dynamic = "force-dynamic";

export default async function MainPage(props: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session: sessionParam } = await props.searchParams;
  const all = listSessions(100);
  const selected =
    (sessionParam && getSession(sessionParam)) ||
    (await ensureActiveSession());
  const captures = listCaptures(selected.id);
  const messages = listMessages(selected.id);

  return (
    <MainView
      sessions={all}
      selected={selected}
      captures={captures}
      messages={messages}
    />
  );
}
