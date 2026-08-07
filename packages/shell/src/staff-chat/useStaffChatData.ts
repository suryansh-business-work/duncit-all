import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useImagekitDirectUpload } from '@duncit/media-picker';
import { readToken, useShellRuntime } from '../lib/runtime';
import { buildChatExport, downloadChatExport } from './export-chat';
import {
  ATTACH_CALL_RECORDING,
  CLEAR_STAFF_THREAD,
  COWORKERS,
  DELETE_STAFF_MESSAGE,
  EDIT_STAFF_MESSAGE,
  FORWARD_STAFF_MESSAGE,
  MARK_THREAD_READ,
  PIN_STAFF_MESSAGE,
  REACT_TO_STAFF_MESSAGE,
  SEND_STAFF_MESSAGE,
  STAFF_CALL_ICE,
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
import { describeFailure, type Failure } from './failure';
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
const NO_ICE_SERVERS: RTCIceServer[] = [];

export function useStaffChatData({ open, peer, meId, meName, search, role }: Options) {
  const runtime = useShellRuntime();
  const client = useApolloClient();
  const { upload, uploading } = useImagekitDirectUpload();
  const [error, setError] = useState<Failure | null>(null);
  /** 0–100 while a file is going up, null when nothing is. */
  const [uploadPct, setUploadPct] = useState<number | null>(null);

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
  // A stable empty list while the query is in flight: a fresh [] each render
  // would give useCall a new dependency every time and rebuild its callbacks.
  // Fetched once and kept: the answer changes only when the platform is
  // reconfigured, and a call must not wait on a round trip to start.
  const iceQuery = useQuery<{ staffCallIceServers: RTCIceServer[] }>(STAFF_CALL_ICE, {
    fetchPolicy: 'cache-first',
  });

  const presenceQuery = useQuery<{
    staffPresence: { user_id: string; status: PresenceStatus; last_seen?: string | null }[];
  }>(
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
  const [clearThread] = useMutation(CLEAR_STAFF_THREAD);

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
  /** Counter behind the local ids, so two sends in one millisecond differ. */
  const outboxSeq = useRef(0);

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
  /**
   * When somebody was last connected.
   *
   * Live where the socket has said so, seeded from the snapshot otherwise —
   * the same two-source rule the status itself follows.
   */
  const lastSeenOf = useCallback(
    (id: string): string | null => {
      const live = presence.lastSeen[id];
      if (live) return live;
      return (
        presenceQuery.data?.staffPresence.find((row) => row.user_id === id)?.last_seen ?? null
      );
    },
    [presence.lastSeen, presenceQuery.data]
  );

  const statusOf = useCallback(
    (id: string): PresenceStatus => {
      const live = presence.others[id];
      if (live) return live;
      const seeded = presenceQuery.data?.staffPresence.find((row) => row.user_id === id);
      return seeded?.status ?? 'OFFLINE';
    },
    [presence.others, presenceQuery.data]
  );

  /**
   * Messages that have left the composer but not yet the network.
   *
   * They are rendered immediately with a clock on the first tick and dropped
   * the moment the real one arrives. A chat where your own words appear only
   * after a round trip feels broken on a bad line, and a failed send that
   * simply vanishes is worse than one that stays and offers a retry.
   */
  const [outbox, setOutbox] = useState<StaffMessage[]>([]);

  const send = useCallback(
    (text: string, attachment?: Attachment) => {
      if (!peer) return;
      // A local id, replaced by the server's. Prefixed so nothing can confuse
      // it for something real — the thread keys off it and a collision would
      // put two messages in one place.
      const localId = `pending-${peer.id}-${Date.now()}-${outboxSeq.current++}`;
      const optimistic: StaffMessage = {
        id: localId,
        from_user_id: meId,
        to_user_id: peer.id,
        text,
        attachment_url: attachment?.url,
        attachment_name: attachment?.name,
        attachment_type: attachment?.type,
        attachment_size: attachment?.size,
        attachment_peaks: attachment?.peaks,
        created_at: new Date().toISOString(),
        pending: true,
      };
      setOutbox((current) => [...current, optimistic]);

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
          setOutbox((current) => current.filter((message) => message.id !== localId));
          messagesQuery.refetch().catch(() => undefined);
          refreshAll();
        })
        .catch(() => {
          // Kept, not dropped: the words are still on screen and the retry
          // button is the only way back to them.
          setOutbox((current) =>
            current.map((message) =>
              message.id === localId ? { ...message, pending: false, failed: true } : message
            )
          );
        });
    },
    [peer, meId, sendMessage, messagesQuery, refreshAll]
  );

  /** Send it again, and forget the attempt that failed. */
  const retry = useCallback(
    (message: StaffMessage) => {
      setOutbox((current) => current.filter((row) => row.id !== message.id));
      const attachment = message.attachment_url
        ? {
            url: message.attachment_url,
            name: message.attachment_name ?? '',
            type: message.attachment_type ?? '',
            size: message.attachment_size,
            peaks: message.attachment_peaks,
          }
        : undefined;
      send(message.text, attachment);
    },
    [send]
  );

  // A different conversation has its own outbox; a failed message must not
  // reappear in somebody else's thread.
  useEffect(() => setOutbox([]), [peer?.id]);

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
      setUploadPct(0);
      // Real byte progress, not a bar that just spins. The uploader has always
      // reported it — the recorder uses it — and "is this 200MB video moving
      // or stuck" is the one thing an indeterminate bar cannot answer.
      upload(file, UPLOAD_FOLDER, setUploadPct)
        .then((url) => {
          setUploadPct(null);
          send('', { url, name: file.name, type: file.type, size: file.size, peaks });
        })
        .catch((err: Error) => {
          setUploadPct(null);
          setError(describeFailure(err, 'shell.chat.failure.uploadFailed'));
        });
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
    // The outbox goes last: it is always the newest thing in the thread, and
    // it is what has not landed yet.
    return [...history, ...live, ...outbox].filter((message) => !hiddenIds.has(message.id));
  }, [messagesQuery.data, older, hiddenIds, outbox]);

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

  /** Empty this conversation for both people, then re-read what is left. */
  const clearConversation = useCallback(() => {
    if (!peer) return;
    clearThread({ variables: { peerId: peer.id } })
      .then(() => {
        // The local history and the outbox are copies of what just went.
        setOlder([]);
        setOutbox([]);
        setReachedStart(true);
        messagesQuery.refetch().catch(() => undefined);
        refreshAll();
      })
      .catch((err: Error) => setError(describeFailure(err, 'shell.chat.failure.unknown')));
  }, [peer, clearThread, messagesQuery, refreshAll]);

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
    lastSeenOf,
    error,
    setError,
    uploading,
    uploadPct,
    sending: sendState.loading,
    threads: threadsQuery.data?.staffThreads ?? [],
    coworkers: coworkersQuery.data?.coworkers ?? [],
    calls: callsQuery.data?.staffCalls ?? [],
    iceServers: iceQuery.data?.staffCallIceServers ?? NO_ICE_SERVERS,
    refetchCalls: callsQuery.refetch,
    messagesLoading: messagesQuery.loading,
    visibleMessages,
    hasMore: !reachedStart && visibleMessages.length > 0,
    loadingMore,
    loadOlder,
    nameOf,
    send,
    retry,
    attachFile,
    exportChat,
    clearConversation,
    change,
    hideForMe,
    attachRecording,
    mutations: { editMessage, deleteMessage, reactToMessage, forwardMessage, pinMessage },
  };
}
