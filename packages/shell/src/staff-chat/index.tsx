import { useCallback, useEffect, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Box, Drawer, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { readToken, useShellRuntime } from '../lib/runtime';
import Conversation from './Conversation';
import CoworkerList from './CoworkerList';
import {
  COWORKERS,
  MARK_THREAD_READ,
  SEND_STAFF_MESSAGE,
  STAFF_MESSAGES,
  STAFF_THREADS,
  STAFF_UNREAD,
  type Coworker,
  type StaffMessage,
  type StaffThread,
} from './queries';
import { useStaffSocket } from './useStaffSocket';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Your own id, so the conversation can tell your lines from theirs. */
  meId: string;
}

/**
 * Chat with a coworker.
 *
 * A drawer rather than a page: the reason to message someone is almost always
 * something on the screen you are already looking at, and a chat that costs you
 * that screen is one you leave the tab for instead.
 */
export function StaffChatDrawer({ open, onClose, meId }: Readonly<Props>) {
  const runtime = useShellRuntime();
  const client = useApolloClient();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [role, setRole] = useState('');
  const [peer, setPeer] = useState<Coworker | null>(null);

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

  const [sendMessage, sendState] = useMutation(SEND_STAFF_MESSAGE);
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

  const socket = useStaffSocket({
    graphqlUrl: runtime?.graphqlUrl ?? '',
    token: readToken(runtime),
    onMessage,
    meId,
    openPeerId: open ? peer?.id ?? null : null,
  });

  const send = (text: string) => {
    if (!peer) return;
    sendMessage({ variables: { toUserId: peer.id, text } })
      .then(() => {
        void messagesQuery.refetch();
        refreshAll();
      })
      .catch(() => undefined);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 400 } } }}
    >
      <Stack direction="row" alignItems="center" sx={{ px: 2, pt: 2, pb: 1 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          Coworkers
        </Typography>
        <IconButton onClick={onClose} aria-label="Close chat">
          <CloseIcon />
        </IconButton>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        {peer ? (
          <Conversation
            peer={peer}
            meId={meId}
            messages={messagesQuery.data?.staffMessages ?? []}
            sending={sendState.loading}
            onBack={() => setPeer(null)}
            onSend={send}
            onTyping={() => socket.typing(peer.id)}
          />
        ) : (
          <CoworkerList
            search={search}
            onSearch={setSearch}
            role={role}
            onRole={setRole}
            threads={threadsQuery.data?.staffThreads ?? []}
            coworkers={coworkersQuery.data?.coworkers ?? []}
            onOpen={setPeer}
          />
        )}
      </Box>
    </Drawer>
  );
}
