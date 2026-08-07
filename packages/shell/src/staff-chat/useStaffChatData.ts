import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useImagekitDirectUpload } from '@duncit/media-picker';
import { readToken, useShellRuntime } from '../lib/runtime';
import { buildChatExport, downloadChatExport } from './export-chat';
import {
  ATTACH_CALL_RECORDING,
  COWORKERS,
  DELETE_STAFF_MESSAGE,
  EDIT_STAFF_MESSAGE,
  FORWARD_STAFF_MESSAGE,
  MARK_THREAD_READ,
  PIN_STAFF_MESSAGE,
  REACT_TO_STAFF_MESSAGE,
  SEND_STAFF_MESSAGE,
  STAFF_CALLS,
  STAFF_MESSAGES,
  STAFF_PRESENCE,
  STAFF_THREADS,
  STAFF_UNREAD,
  type Coworker,
  type StaffCall,
  type StaffMessage,
  type StaffThread,
} from './queries';
import { usePresence, type PresenceStatus } from './usePresence';
import { useStaffSocket } from './useStaffSocket';

/** Where chat files land, so they are findable in the file manager later. */
const UPLOAD_FOLDER = '/staff-chat';

interface Options {
  open: boolean;
  peer: Coworker | null;
  meId: string;
  meName?: string;
  /** The coworker search, already debounced by the panel. */
  search: string;
  role: string;
}

export interface Attachment {
  url: string;
  name: string;
  type: string;
  size?: number;
  /** Waveform samples, for a voice note. */
  peaks?: number[];
}

/**
 * Everything staff chat reads and writes.
 *
 * Split out of the panel because the panel was doing two jobs: deciding what
 * is on screen, and being the whole data layer for a feature with six queries,
 * eight mutations, a socket and an upload path. The render is the part that
 * changes when the design does; this is the part that changes when the API
 * does, and they had no business being edited in the same file.
 */
export function useStaffChatData({ open, peer, meId, meName, search, role }: Options) {
  const runtime = useShellRuntime();
  const client = useApolloClient();
  const { upload, uploading } = useImagekitDirectUpload();
  const [error, setError] = useState<string | null>(null);

  const threadsQuery = useQuery<{ staffThreads: StaffThread[] }>(STAFF_THREADS, {
    skip: !open,
    fetchPolicy: 'cache-and-network',
  });
  const coworkersQuery = useQuery<{ coworkers: Coworker[] }>(COWORKERS, {
    variables: { search: search || null, role: role || null },
    skip: !open,
    fetchPolicy: 'cache-and-network',
  });
  const messagesQuery = useQuery<{ staffMessages: StaffMessage[] }>(STAFF_MESSAGES, {
    variables: { peerId: peer?.id, limit: 100 },
    skip: !peer,
    fetchPolicy: 'cache-and-network',
  });
  /** Calls on this line, merged into the thread beside the messages. */
  const callsQuery = useQuery<{ staffCalls: StaffCall[] }>(STAFF_CALLS, {
    variables: { peerId: peer?.id, limit: 50 },
    skip: !peer,
    fetchPolicy: 'cache-and-network',
  });
  const presenceQuery = useQuery<{ staffPresence: { user_id: string; status: PresenceStatus }[] }>(
    STAFF_PRESENCE,
    { skip: !open, fetchPolicy: 'network-only' }
  );

  const [sendMessage, sendState] = useMutation(SEND_STAFF_MESSAGE);
  const [editMessage] = useMutation(EDIT_STAFF_MESSAGE);
  const [deleteMessage] = useMutation(DELETE_STAFF_MESSAGE);
  const [reactToMessage] = useMutation(REACT_TO_STAFF_MESSAGE);
  const [forwardMessage] = useMutation(FORWARD_STAFF_MESSAGE);
  const [pinMessage] = useMutation(PIN_STAFF_MESSAGE);
  const [markRead] = useMutation(MARK_THREAD_READ);
  const [attachRecording] = useMutation(ATTACH_CALL_RECORDING);

  /**
   * Messages hidden on THIS device only.
   *
   * "Delete for me" cannot reach the other person's copy, so it does not
   * pretend to: it is a local list, and saying so is more honest than a server
   * flag that would look like it had done more than it did.
   */
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  /**
   * History fetched by scrolling up, oldest-first, kept apart from the live
   * page so an arriving message cannot renumber what is already on screen.
   */
  const [older, setOlder] = useState<StaffMessage[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reachedStart, setReachedStart] = useState(false);

  // A different conversation starts its own history.
  useEffect(() => {
    setOlder([]);
    setReachedStart(false);
  }, [peer?.id]);

  const refreshAll = useCallback(() => {
    threadsQuery.refetch().catch(() => undefined);
    client.refetchQueries({ include: [STAFF_UNREAD] }).catch(() => undefined);
  }, [threadsQuery, client]);

  // Opening a conversation is what marks it read — not receiving it.
  useEffect(() => {
    if (!peer) return;
    markRead({ variables: { peerId: peer.id } })
      .then(refreshAll)
      .catch(() => undefined);
  }, [peer, markRead, refreshAll]);

  const onMessage = useCallback(
    (message: StaffMessage) => {
      const involved = peer && (message.from_user_id === peer.id || message.to_user_id === peer.id);
      if (involved) messagesQuery.refetch().catch(() => undefined);
      refreshAll();
    },
    [peer, messagesQuery, refreshAll]
  );

  const { socket, typing, typingAt } = useStaffSocket({
    graphqlUrl: runtime?.graphqlUrl ?? '',
    token: readToken(runtime),
    onMessage,
    onMessageChanged: onMessage,
    meId,
    openPeerId: open ? (peer?.id ?? null) : null,
  });

  const presence = usePresence(socket, meId);

  // The socket only reports CHANGES; the first paint needs the snapshot.
  const statusOf = useCallback(
    (id: string): PresenceStatus => {
      const live = presence.others[id];
      if (live) return live;
      const seeded = presenceQuery.data?.staffPresence.find((row) => row.user_id === id);
      return seeded?.status ?? 'OFFLINE';
    },
    [presence.others, presenceQuery.data]
  );

  const send = useCallback(
    (text: string, attachment?: Attachment) => {
      if (!peer) return;
      sendMessage({
        variables: {
          toUserId: peer.id,
          text,
          attachmentUrl: attachment?.url ?? null,
          attachmentName: attachment?.name ?? null,
          attachmentType: attachment?.type ?? null,
          // The size was declared on the message type all along and never sent,
          // so every attachment row showed no size at all.
          attachmentSize: attachment?.size ?? null,
          attachmentPeaks: attachment?.peaks ?? null,
        },
      })
        .then(() => {
          messagesQuery.refetch().catch(() => undefined);
          refreshAll();
        })
        .catch(() => undefined);
    },
    [peer, sendMessage, messagesQuery, refreshAll]
  );

  /**
   * Upload, then post what came back.
   *
   * Straight to ImageKit like every other upload in the product, so the file is
   * in the file manager too rather than somewhere only chat knows about. The
   * failure is SHOWN: an upload that fails silently looks exactly like one still
   * running, and the person tries again instead of reading what ImageKit said.
   */
  const attachFile = useCallback(
    (file: File, peaks?: number[]) => {
      upload(file, UPLOAD_FOLDER)
        .then((url) =>
          send('', { url, name: file.name, type: file.type, size: file.size, peaks })
        )
        .catch((err: Error) => setError(err.message));
    },
    [upload, send]
  );

  const exportChat = useCallback(async () => {
    if (!peer) return;
    const calls = await client.query<{ staffCalls: StaffCall[] }>({
      query: STAFF_CALLS,
      variables: { peerId: peer.id, limit: 200 },
      fetchPolicy: 'network-only',
    });
    const text = buildChatExport({
      me: { id: meId, name: meName || 'You' },
      peer,
      messages: messagesQuery.data?.staffMessages ?? [],
      calls: calls.data?.staffCalls ?? [],
    });
    downloadChatExport(text, peer.name);
  }, [client, peer, meId, meName, messagesQuery.data]);

  /**
   * What the thread renders: the history scrolled into view, then the live
   * page, minus anything hidden with "delete for me".
   */
  const visibleMessages = useMemo(() => {
    const live = messagesQuery.data?.staffMessages ?? [];
    const seen = new Set(live.map((message) => message.id));
    const history = older.filter((message) => !seen.has(message.id));
    return [...history, ...live].filter((message) => !hiddenIds.has(message.id));
  }, [messagesQuery.data, older, hiddenIds]);

  /** Names for reaction tooltips, reply strips and forwarded-from lines. */
  const nameOf = useCallback(
    (userId: string) => {
      if (userId === meId) return 'You';
      if (userId === peer?.id) return peer.name;
      return 'Someone';
    },
    [meId, peer]
  );

  /**
   * History above what is loaded.
   *
   * A created_at cursor, not an offset: the thread gains messages while it is
   * being scrolled, and an offset would show one twice or skip one every time
   * that happened. A short page means there is nothing above it.
   */
  const loadOlder = useCallback(async () => {
    const oldest = visibleMessages[0];
    if (!peer || !oldest?.created_at || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await client.query<{ staffMessages: StaffMessage[] }>({
        query: STAFF_MESSAGES,
        variables: { peerId: peer.id, limit: 50, before: oldest.created_at },
        fetchPolicy: 'network-only',
      });
      const rows = page.data?.staffMessages ?? [];
      if (rows.length < 50) setReachedStart(true);
      if (rows.length > 0) setOlder((current) => [...rows, ...current]);
    } catch {
      // Leave what is on screen alone; the button stays for another try.
    } finally {
      setLoadingMore(false);
    }
  }, [client, peer, visibleMessages, loadingMore]);

  /** Run a mutation that changes one message, then re-read the thread. */
  const change = useCallback(
    (mutate: typeof editMessage, variables: Record<string, unknown>) => {
      mutate({ variables })
        .then(() => {
          messagesQuery.refetch().catch(() => undefined);
          refreshAll();
        })
        .catch(() => undefined);
    },
    [messagesQuery, refreshAll]
  );

  const hideForMe = useCallback(
    (id: string) => setHiddenIds((current) => new Set(current).add(id)),
    []
  );

  return {
    socket,
    typing,
    typingAt,
    presence,
    statusOf,
    error,
    setError,
    uploading,
    sending: sendState.loading,
    threads: threadsQuery.data?.staffThreads ?? [],
    coworkers: coworkersQuery.data?.coworkers ?? [],
    calls: callsQuery.data?.staffCalls ?? [],
    refetchCalls: callsQuery.refetch,
    messagesLoading: messagesQuery.loading,
    visibleMessages,
    hasMore: !reachedStart && visibleMessages.length > 0,
    loadingMore,
    loadOlder,
    nameOf,
    send,
    attachFile,
    exportChat,
    change,
    hideForMe,
    attachRecording,
    mutations: { editMessage, deleteMessage, reactToMessage, forwardMessage, pinMessage },
  };
}
