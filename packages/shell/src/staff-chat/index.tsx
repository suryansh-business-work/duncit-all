import { useCallback, useEffect, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Alert, Box, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useImagekitDirectUpload } from '@duncit/media-picker';
import { readToken, useShellRuntime } from '../lib/runtime';
import CallPanel from './CallPanel';
import Conversation from './Conversation';
import CoworkerList from './CoworkerList';
import StatusMenu from './StatusMenu';
import { buildChatExport, downloadChatExport } from './export-chat';
import {
  COWORKERS,
  DELETE_STAFF_MESSAGE,
  EDIT_STAFF_MESSAGE,
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
  const [markRead] = useMutation(MARK_THREAD_READ);

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
        onShare={() => void call.shareScreen()}
        onStopSharing={() => void call.stopSharing()}
      />

      <Box sx={{ flex: 1, minHeight: 0 }}>
        {peer ? (
          <Conversation
            peer={peer}
            meId={meId}
            status={statusOf(peer.id)}
            messages={messagesQuery.data?.staffMessages ?? []}
            sending={sendState.loading}
            uploading={uploading}
            onBack={() => setPeer(null)}
            onSend={send}
            onAttach={attach}
            onEdit={(id, text) => change(editMessage, { id, text })}
            onDelete={(id) => change(deleteMessage, { id })}
            onReact={(id, kind) => change(reactToMessage, { id, kind })}
            onTyping={() => typing(peer.id)}
            onCall={(kind) => void call.call(peer.id, kind)}
            onExport={() => void exportChat()}
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
