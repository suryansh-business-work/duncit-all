import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { isPodActive } from '../../../utils/podStatus';
import { clubUrl, podUrl } from '../../../utils/seoUrls';
import ReportContentDialog from '../../../components/content-report/ReportContentDialog';
import ChatClosedNotice from '../ChatClosedNotice';
import ChatParticipants from '../ChatParticipants';
import ChatRetentionNotice from '../ChatRetentionNotice';
import ChatRoomHeader from '../ChatRoomHeader';
import MessageActionsMenu from '../MessageActionsMenu';
import MessageComposer from '../MessageComposer';
import { CHAT_PARTICIPANTS, REACT_MSG } from '../queries';
import { useMessageActions } from '../useMessageActions';
import { useChatRoomSource } from '../useChatRoomSource';
import { usePodSocket, type ChatRoomKind } from '../usePodSocket';
import { useTranslation } from '../../../i18n/useTranslation';
import { parseApiError } from '@duncit/utils';
import type { ChatMessage, ChatParticipantsData, ChatSocketMessage } from '../chat.types';
import ChatMessageList from './ChatMessageList';
import ChatRoomLoading from './ChatRoomLoading';
import ChatRoomOverlays from './ChatRoomOverlays';

/** A pod's chat (`/chats/:id`) or a club's (`/chats/club/:id`) — one room UI. */
export default function ChatRoomPage({ kind = 'POD' }: Readonly<{ kind?: ChatRoomKind }>) {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isPod = kind === 'POD';
  const room = useChatRoomSource(kind, id);
  const { data: peopleData } = useQuery<ChatParticipantsData>(CHAT_PARTICIPANTS, {
    variables: { pod_id: id },
    fetchPolicy: 'cache-and-network',
    skip: !isPod || !id,
  });
  const [text, setText] = useState('');
  const [picker, setPicker] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const [reactAnchor, setReactAnchor] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [react] = useMutation(REACT_MSG);
  const [live, setLive] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pod = room.pod;
  // The server's word first; the dates are the fallback while it loads.
  const podEnded = isPod && (room.closed || (pod ? !isPodActive(pod.pod_date_time, pod.pod_end_date_time) : false));
  const people = peopleData?.chatParticipants;

  const openLinked = () => {
    if (isPod && pod?.club_slug && pod?.pod_id) navigate(podUrl(pod.club_slug, pod.pod_id));
    else if (!isPod && room.clubSlug) navigate(clubUrl(room.clubSlug));
    else setError(t('mweb.chatRoom.podDetailsAreUnavailableForThis'));
  };
  const messages = useMemo(() => {
    const merged = [...room.messages];
    const ids = new Set(room.messages.map((m) => m.id));
    for (const m of live) if (!ids.has(m.id)) merged.push(m);
    return merged;
  }, [room.messages, live]);

  const onMessage = useCallback((msg: ChatMessage) => setLive((p) => [...p, msg]), []);
  const onReactionUpdate = useCallback(
    (msg: ChatSocketMessage) =>
      setLive((p) => p.map((m) => (m.id === msg.id ? { ...m, reactions: msg.reactions ?? m.reactions } : m))),
    []
  );
  const onDeleted = useCallback(
    (msg: ChatSocketMessage) => setLive((p) => p.filter((m) => m.id !== msg.id)),
    []
  );

  const actions = useMessageActions({
    messages,
    myId: room.myId,
    onRemoved: (messageId) => {
      onDeleted({ id: messageId });
      room.refetch();
    },
    onError: setError,
  });

  usePodSocket({
    podId: id,
    kind,
    refetch: room.refetch,
    onMessage,
    onReactionUpdate,
    onDeleted,
    onError: setError,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const submit = async (overrideImage?: string) => {
    const body = text.trim();
    if (!body && !overrideImage) return;
    try {
      await room.send({
        type: overrideImage ? 'IMAGE' : 'TEXT',
        text: overrideImage ? '' : body,
        image_url: overrideImage || null,
      });
      setText('');
    } catch (e) {
      setError(parseApiError(e) || t('mweb.chatRoom.sendFailed'));
    }
  };

  const onReact = async (emoji: string) => {
    if (!reactAnchor) return;
    try {
      await react({ variables: { message_id: reactAnchor.id, emoji } });
    } catch (err) {
      setError(parseApiError(err) || t('mweb.chatRoom.reactFailed'));
    }
    setReactAnchor(null);
  };

  if (room.loading && !room.hasData) return <ChatRoomLoading />;

  return (
    <Stack data-testid="chat-room-screen" sx={{ height: '100%', minHeight: 0, mx: { xs: -1.25, sm: -2 } }}>
      <ChatRoomHeader
        title={room.title}
        messageCount={messages.length}
        onBack={() => navigate(isPod ? '/chats' : '/chats?selectedtab_chats=CLUBS')}
        onOpenPod={openLinked}
      />

      {people && (
        <ChatParticipants
          hosts={people.hosts}
          participants={people.participants}
          count={people.participant_count}
          onOpenProfile={(userId) => navigate(`/u/${userId}`)}
        />
      )}

      <ChatRetentionNotice deletesAt={room.deletesAt} retentionDays={room.retentionDays} />

      {error && (
        <Alert severity="error" data-testid="chat-room-error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <ChatMessageList
        scrollRef={scrollRef}
        podEnded={isPod ? podEnded : null}
        messages={messages}
        myId={room.myId}
        onOpenReact={(el, messageId) => setReactAnchor({ el, id: messageId })}
        onOpenActions={actions.open}
      />

      {podEnded ? (
        <ChatClosedNotice />
      ) : (
        <MessageComposer
          text={text}
          setText={setText}
          onSend={() => submit()}
          onOpenPicker={() => setPicker(true)}
          onOpenEmoji={setEmojiAnchor}
        />
      )}

      <ChatRoomOverlays
        emojiAnchor={emojiAnchor}
        onCloseEmoji={() => setEmojiAnchor(null)}
        onInsertEmoji={(e) => {
          setText((p) => p + e);
          setEmojiAnchor(null);
        }}
        reactAnchorEl={reactAnchor?.el ?? null}
        onCloseReact={() => setReactAnchor(null)}
        onReact={onReact}
        picker={picker}
        onClosePicker={() => setPicker(false)}
        onPicked={(url) => {
          setPicker(false);
          submit(url);
        }}
      />
      <MessageActionsMenu
        target={actions.target}
        canModerate={room.canModerate}
        onClose={actions.close}
        onReact={(el, messageId) => setReactAnchor({ el, id: messageId })}
        onDelete={actions.remove}
        onReport={actions.report}
      />
      <ReportContentDialog targetId={actions.reportId} kind="MESSAGE" onClose={actions.closeReport} />
    </Stack>
  );
}
