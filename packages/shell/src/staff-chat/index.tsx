import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Alert, Box, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useImagekitDirectUpload } from '@duncit/media-picker';
import { readToken, useShellRuntime } from '../lib/runtime';
import CallPanel from './call-panel';
import { useCallRecorder } from './useCallRecorder';
import Conversation from './Conversation';
import CoworkerList from './CoworkerList';
import StatusMenu from './StatusMenu';
import { buildChatExport, downloadChatExport } from './export-chat';
import {
  COWORKERS,
  DELETE_STAFF_MESSAGE,
  EDIT_STAFF_MESSAGE,
  FORWARD_STAFF_MESSAGE,
  PIN_STAFF_MESSAGE,
  REACT_TO_STAFF_MESSAGE,
  MARK_THREAD_READ,
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
import { useCall } from './useCall';
import { useChatSettings } from './useChatSettings';
import ChatSettingsMenu from './ChatSettingsMenu';
import ScreenSharePanel from './remote-control/ScreenSharePanel';
import { usePresence, type PresenceStatus } from './usePresence';
import { useStaffSocket } from './useStaffSocket';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Your own id, so the conversation can tell your lines from theirs. */
  meId: string;
  /** Your own name, for the export's header. */
  meName?: string;
}

/** Where chat files land, so they are findable in the file manager later. */
const UPLOAD_FOLDER = '/staff-chat';

/**
 * Chat with a coworker.
 *
 * A docked panel, not a drawer: no backdrop, and the page beside it is pushed
 * rather than covered. The reason to message someone is almost always something
 * on the screen you are already looking at, so a chat that greys that screen out
 * is a chat you close before you can quote it.
 */
export function StaffChatPanel({ open, onClose, meId, meName }: Readonly<Props>) {
  const runtime = useShellRuntime();
  const client = useApolloClient();
  const { upload, uploading } = useImagekitDirectUpload();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [role, setRole] = useState('');
  const [peer, setPeer] = useState<Coworker | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const threadsQuery = useQuery<{ staffThreads: StaffThread[] }>(STAFF_THREADS, {
    skip: !open,
    fetchPolicy: 'cache-and-network',
  });
  const coworkersQuery = useQuery<{ coworkers: Coworker[] }>(COWORKERS, {
    variables: { search: debounced || null, role: role || null },
    skip: !open,
    fetchPolicy: 'cache-and-network',
  });
  const messagesQuery = useQuery<{ staffMessages: StaffMessage[] }>(STAFF_MESSAGES, {
    variables: { peerId: peer?.id, limit: 100 },
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

  const { settings, update: updateSettings, formats, spacing } = useChatSettings();
  /** What is being answered, until it is sent. */
  const [replyTo, setReplyTo] = useState<StaffMessage | null>(null);
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
  /** Whether the screen-share panel is open for this conversation. */
  const [sharingWith, setSharingWith] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reachedStart, setReachedStart] = useState(false);

  // A different conversation starts its own history.
  useEffect(() => {
    setOlder([]);
    setReachedStart(false);
  }, [peer?.id]);

  const refreshAll = useCallback(() => {
    void threadsQuery.refetch();
    void client.refetchQueries({ include: [STAFF_UNREAD] });
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
      if (involved) void messagesQuery.refetch();
      refreshAll();
    },
    [peer, messagesQuery, refreshAll]
  );

  const { socket, typing } = useStaffSocket({
    graphqlUrl: runtime?.graphqlUrl ?? '',
    token: readToken(runtime),
    onMessage,
    onMessageChanged: onMessage,
    meId,
    openPeerId: open ? peer?.id ?? null : null,
  });

  const presence = usePresence(socket, meId);
  const call = useCall(socket, meId);
  const recorder = useCallRecorder({
    connected: call.phase === 'connected',
    localStream: call.localStream,
    remoteStream: call.remoteStream,
  });

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

  const send = (text: string, attachment?: { url: string; name: string; type: string }) => {
    if (!peer) return;
    sendMessage({
      variables: {
        toUserId: peer.id,
        text,
        attachmentUrl: attachment?.url ?? null,
        attachmentName: attachment?.name ?? null,
        attachmentType: attachment?.type ?? null,
      },
    })
      .then(() => {
        void messagesQuery.refetch();
        refreshAll();
      })
      .catch(() => undefined);
  };

  const attach = (file: File) => {
    // Straight to ImageKit, like every other upload in the product — the file
    // is then in the file manager too, rather than somewhere only chat knows.
    //
    // The failure is SHOWN. An upload that fails silently looks exactly like one
    // that is still running, and the person tries again instead of reading what
    // ImageKit said.
    upload(file, UPLOAD_FOLDER)
      .then((url) => send('', { url, name: file.name, type: file.type }))
      .catch((err: Error) => setError(err.message));
  };

  const exportChat = async () => {
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
  };

  /**
   * What the thread renders: the history scrolled into view, then the live
   * page, minus anything hidden with "delete for me" — which cannot reach the
   * other person's copy and so is applied here rather than pretending the
   * server did it.
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

  const change = (mutate: typeof editMessage, variables: Record<string, unknown>) => {
    mutate({ variables })
      .then(() => {
        void messagesQuery.refetch();
        refreshAll();
      })
      .catch(() => undefined);
  };

  return (
    <Box
      sx={{
        width: { xs: '100%', sm: 380 },
        flexShrink: 0,
        borderLeft: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
        <Typography variant="subtitle1" sx={{ flex: 1 }}>
          Coworkers
        </Typography>
        <ChatSettingsMenu settings={settings} onChange={updateSettings} />
        <StatusMenu status={presence.mine} onChange={presence.choose} />
        <IconButton size="small" onClick={onClose} aria-label="Close chat">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ m: 1 }}>
          {error}
        </Alert>
      )}

      {/* Screen sharing is its own panel, above the call: a shared screen with
          a pointer on it is the thing being looked at, and burying it inside
          the call strip would make it the smallest element on screen. */}
      {sharingWith && peer && (
        <ScreenSharePanel
          peerId={peer.id}
          peerName={peer.name}
          onClose={() => setSharingWith(false)}
        />
      )}

      <CallPanel
        phase={call.phase}
        kind={call.kind}
        peer={peer}
        error={call.error}
        localStream={call.localStream}
        remoteStream={call.remoteStream}
        onAnswer={() => void call.answer()}
        onDecline={call.decline}
        onHangUp={call.hangUp}
        micId={call.micId}
        camId={call.camId}
        onMic={call.setMicId}
        onCam={call.setCamId}
        sharing={call.sharing}
        onShare={() => call.shareScreen().catch(() => undefined)}
        onStopSharing={() => call.stopSharing().catch(() => undefined)}
        muted={call.muted}
        cameraOff={call.cameraOff}
        onToggleMute={call.toggleMute}
        onToggleCamera={call.toggleCamera}
        recordStage={recorder.stage}
        recordPct={recorder.pct}
        recordUrl={recorder.url}
        recordError={recorder.error}
        onToggleRecord={recorder.toggle}
        onSendRecording={(url) => {
          send('', { url, name: 'Call recording.mp4', type: 'video/mp4' });
          recorder.reset();
        }}
        onDismissRecording={recorder.reset}
      />

      <Box sx={{ flex: 1, minHeight: 0 }}>
        {peer ? (
          <Conversation
            peer={peer}
            meId={meId}
            status={statusOf(peer.id)}
            messages={visibleMessages}
            sending={sendState.loading}
            uploading={uploading}
            onBack={() => setPeer(null)}
            onSend={send}
            onAttach={attach}
            onEdit={(id, text) => change(editMessage, { id, text })}
            onDelete={(id, forEveryone) => {
              if (forEveryone) {
                change(deleteMessage, { id });
                return;
              }
              setHiddenIds((current) => new Set(current).add(id));
            }}
            onReact={(id, emoji) => change(reactToMessage, { id, emoji })}
            onReply={setReplyTo}
            onCancelReply={() => setReplyTo(null)}
            replyTo={replyTo}
            onForward={(message) => {
              // One-to-one threads: forwarding goes to whoever you open next,
              // so it lands as a normal message in that conversation.
              if (peer) change(forwardMessage, { id: message.id, toUserId: peer.id });
            }}
            onPin={(id) => change(pinMessage, { id })}
            loading={messagesQuery.loading}
            hasMore={!reachedStart && visibleMessages.length > 0}
            loadingMore={loadingMore}
            onLoadMore={loadOlder}
            settings={settings}
            formats={formats}
            spacing={spacing}
            nameOf={nameOf}
            onTyping={() => typing(peer.id)}
            onCall={(kind) => void call.call(peer.id, kind)}
            onExport={() => void exportChat()}
            onShareScreen={() => setSharingWith(true)}
          />
        ) : (
          <CoworkerList
            search={search}
            onSearch={setSearch}
            role={role}
            onRole={setRole}
            threads={threadsQuery.data?.staffThreads ?? []}
            coworkers={coworkersQuery.data?.coworkers ?? []}
            statusOf={statusOf}
            onOpen={setPeer}
          />
        )}
      </Box>
    </Box>
  );
}
