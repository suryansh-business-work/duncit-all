import { useSyncExternalStore, type ReactNode } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { fireAndForget } from '@duncit/logs';
import { intelLog } from '../lib/logger';
import { useIntelEvents, type ToolFrame } from '../lib/useIntelEvents';

/**
 * The live half of chat. Frames build `live[message]` until the turn finishes;
 * then the stored queries are re-read — the truth the frames only previewed.
 * The store lives outside React so a stream survives moving from a new chat to
 * its own address, whatever the router does with the page in between.
 */

export interface LiveTurn {
  text: string;
  tools: Array<{ name: string; title?: string; status: string }>;
}

type Live = Readonly<Record<string, LiveTurn>>;
let live: Live = {};
const listeners = new Set<() => void>();
const set = (next: Live) => {
  live = next;
  listeners.forEach((l) => l());
};

export const liveStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: (): Live => live,
  delta(messageId: string, text: string) {
    const turn = live[messageId] ?? { text: '', tools: [] };
    set({ ...live, [messageId]: { ...turn, text: turn.text + text } });
  },
  tool(f: ToolFrame) {
    const turn = live[f.message_id] ?? { text: '', tools: [] };
    const others = turn.tools.filter((tool) => !(tool.name === f.name && tool.status === 'RUNNING'));
    set({ ...live, [f.message_id]: { ...turn, tools: [...others, { name: f.name, title: f.title, status: f.status }] } });
  },
  done(messageId: string) {
    const next = { ...live };
    delete next[messageId];
    set(next);
  },
  reset: () => set({}),
};

export const useLiveTurns = (): Live => useSyncExternalStore(liveStore.subscribe, liveStore.get, liveStore.get);

/** Listens for the signed-in person's frames and keeps the stored queries fresh. */
export function ChatStreamProvider({ children }: Readonly<{ children: ReactNode }>) {
  const client = useApolloClient();
  const reread = (include: string[]) => fireAndForget(client.refetchQueries({ include }), intelLog, '/', 'ChatStream');
  useIntelEvents({
    onDelta: (f) => liveStore.delta(f.message_id, f.text),
    onTool: (f) => liveStore.tool(f),
    onDone: (f) => {
      reread(['IntelThread', 'IntelConversations', 'IntelConversationCounts', 'IntelBootstrap']);
      liveStore.done(f.message_id);
    },
    onTitle: () => reread(['IntelThread', 'IntelConversations']),
    onApproval: () => reread(['IntelThread', 'IntelApprovals', 'IntelApproval', 'IntelBootstrap']),
  });
  return <>{children}</>;
}
