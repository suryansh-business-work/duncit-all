import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import { isPodActive } from '../../../utils/podStatus';
import { clubUrl, podUrl } from '../../../utils/seoUrls';
import ReportContentDialog from '../../../components/content-report/ReportContentDialog';
import ChatMuteMenu from '../../../components/chat-state/ChatMuteMenu';
import { useChatMute } from '../../../components/chat-state/useChatMute';
import ChatClosedNotice from '../ChatClosedNotice';
import ChatParticipants from '../ChatParticipants';
import ChatReplyStrip from '../ChatReplyStrip';
import ChatRetentionNotice from '../ChatRetentionNotice';
import ChatRoomHeader from '../ChatRoomHeader';
import MentionSuggestions from '../MentionSuggestions';
import MessageActionsMenu from '../MessageActionsMenu';
import MessageComposer from '../MessageComposer';
import { CHAT_PARTICIPANTS, REACT_MSG } from '../queries';
import { useMessageActions } from '../useMessageActions';
import { useChatRoomSource } from '../useChatRoomSource';
import { useLiveMessages } from '../useLiveMessages';
import { useRoomComposer } from '../useRoomComposer';
import type { ChatRoomKind } from '../usePodSocket';
import { useTranslation } from '../../../i18n/useTranslation';
import type { ChatParticipantsData } from '../chat.types';
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
  const [picker, setPicker] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const [reactAnchor, setReactAnchor] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [react] = useMutation(REACT_MSG);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const people = peopleData?.chatParticipants;

  const mute = useChatMute({
    kind,
    id,
    initial: room.mute,
    onError: setError,
    failedText: t('mweb.chatRoom.mute.failed'),
  });
  const { messages, onDeleted } = useLiveMessages({ kind, id, room, muted: mute.muted, onError: setError });
  const composer = useRoomComposer({ kind, id, room, messages, people, onError: setError });

  const pod = room.pod;
  // The server's word first; the dates are the fallback while it loads.
  const podEnded = isPod && (room.closed || (pod ? !isPodActive(pod.pod_date_time, pod.pod_end_date_time) : false));

  const podLink = pod?.club_slug && pod?.pod_id ? podUrl(pod.club_slug, pod.pod_id) : null;
  const linked = isPod ? podLink : room.clubSlug && clubUrl(room.clubSlug);
  const openLinked = () =>
    linked ? navigate(linked) : setError(t('mweb.chatRoom.podDetailsAreUnavailableForThis'));
  // Back lands on the room's pod or club; the chats list only when that link is unknown.
  const goBack = () => navigate(linked || (isPod ? '/chats' : '/chats?selectedtab_chats=CLUBS'));
  const openProfile = (userId: string) => navigate(`/u/${userId}`);

  const actions = useMessageActions({
    messages,
    myId: room.myId,
    onRemoved: (messageId) => {
      onDeleted({ id: messageId });
      room.refetch();
    },
    onError: setError,
  });

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
        onBack={goBack}
        onOpenPod={openLinked}
        actions={<ChatMuteMenu muted={mute.muted} mutedUntil={mute.mutedUntil} busy={mute.busy} onChoose={mute.choose} />}
      />

      {people && (
        <ChatParticipants
          hosts={people.hosts}
          participants={people.participants}
          count={people.participant_count}
          onOpenProfile={openProfile}
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
        canLoadOlder={room.canLoadOlder}
        loadOlder={room.loadOlder}
        onOpenProfile={openProfile}
      />

      {podEnded ? (
        <ChatClosedNotice />
      ) : (
        <>
          {composer.replyTo && (
            <ChatReplyStrip
              replyTo={composer.replyTo}
              mine={String(composer.replyTo.user_id) === String(room.myId)}
              onCancel={composer.cancelReply}
            />
          )}
          <MentionSuggestions members={composer.mention.candidates} onPick={composer.mention.pick} />
          <MessageComposer
            text={composer.text}
            setText={composer.setText}
            onSend={() => composer.submit()}
            onOpenPicker={() => setPicker(true)}
            onOpenEmoji={setEmojiAnchor}
            inputRef={composer.inputRef}
            onCaretMove={composer.trackCaret}
            onEnterPick={composer.mention.pickFirst}
          />
        </>
      )}

      <ChatRoomOverlays
        emojiAnchor={emojiAnchor}
        onCloseEmoji={() => setEmojiAnchor(null)}
        onInsertEmoji={(e) => {
          composer.setText((p) => p + e);
          setEmojiAnchor(null);
        }}
        reactAnchorEl={reactAnchor?.el ?? null}
        onCloseReact={() => setReactAnchor(null)}
        onReact={onReact}
        picker={picker}
        onClosePicker={() => setPicker(false)}
        onPicked={(url) => {
          setPicker(false);
          composer.submit(url);
        }}
      />
      <MessageActionsMenu
        target={actions.target}
        canModerate={room.canModerate}
        onClose={actions.close}
        onReact={(el, messageId) => setReactAnchor({ el, id: messageId })}
        onReply={podEnded ? undefined : composer.startReply}
        onDelete={actions.remove}
        onReport={actions.report}
      />
      <ReportContentDialog targetId={actions.reportId} kind="MESSAGE" onClose={actions.closeReport} />
    </Stack>
  );
}
