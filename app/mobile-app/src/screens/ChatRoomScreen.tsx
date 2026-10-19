import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ScrollView } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ChatClosedNotice } from '@/components/chat/ChatClosedNotice';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatErrorBanner } from '@/components/chat/ChatErrorBanner';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import {
  ChatMessageActionsSheet,
  type MessageActionsTarget,
} from '@/components/chat/ChatMessageActionsSheet';
import { ChatMuteButton } from '@/components/chat/ChatMuteButton';
import { ChatParticipantsPanel } from '@/components/chat/ChatParticipantsPanel';
import { ChatReplyStrip } from '@/components/chat/ChatReplyStrip';
import { ChatRetentionNotice } from '@/components/chat/ChatRetentionNotice';
import { ChatRoomHeaderBar } from '@/components/chat/ChatRoomHeaderBar';
import { EmojiBar } from '@/components/chat/EmojiBar';
import { MentionSuggestionList } from '@/components/chat/MentionSuggestionList';
import { ReportContentSheet } from '@/components/content-report/ReportContentSheet';
import { ChatRoomKind } from '@/generated/graphql/graphql';
import { useChatRoom, type RoomReader } from '@/hooks/useChatRoom';
import { useChatImagePicker } from '@/hooks/useChatImagePicker';
import { useChatMute } from '@/hooks/useChatMute';
import { useChatParticipants } from '@/hooks/useChat';
import { useMe } from '@/hooks/useMe';
import { useRoomComposer } from '@/hooks/useRoomComposer';
import type { RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';
import { useTranslation } from '@/hooks/useTranslation';

type EmojiTarget = { type: 'compose' } | { type: 'react'; id: string } | null;

/** Live chat — a pod's room (`podId`) or a club's (`clubId`): history + realtime
 * messages, with send, image, reactions, replies, @-mentions, mute, delete and
 * report. RN twin of mWeb's ChatRoomPage. */
export function ChatRoomScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { podId, clubId, title } = useRoute<RouteProp<RootStackParamList, 'ChatRoom'>>().params;
  const isClub = !!clubId;
  const roomId = clubId ?? podId ?? '';
  const kind = isClub ? 'CLUB' : 'POD';
  const reader = useRef<RoomReader>({});
  const room = useChatRoom(roomId, kind, reader);
  const { messages, podEnded, error, setError, sendText, react } = room;
  const { hosts, participants, count } = useChatParticipants(isClub ? '' : roomId);
  const { data: meData } = useMe();
  const meId = meData?.me?.user_id;
  const mute = useChatMute({
    kind: isClub ? ChatRoomKind.Club : ChatRoomKind.Pod,
    id: roomId,
    initial: room.mute,
    onError: setError,
    failedText: t('mweb.chatRoom.mute.failed'),
  });
  reader.current = { meId, muted: mute.muted };
  const podPeople = useMemo(() => [...hosts, ...participants], [hosts, participants]);
  const composer = useRoomComposer({ kind, roomId, meId, messages, podPeople, sendText });
  const pickImage = useChatImagePicker({ sendImage: room.sendImage, onError: setError });
  const roomTitle = room.roomTitle ?? title;

  const openLinked = () => {
    if (isClub) navigation.navigate('ClubDetails', { clubId: roomId, title: roomTitle });
    else navigation.navigate('PodDetails', { podId: roomId, title: roomTitle });
  };
  // Back lands on the room's pod or club: popTo returns to it when it is already
  // in the stack, otherwise it replaces this chat with it.
  const goBack = () => {
    if (isClub) navigation.popTo('ClubDetails', { clubId: roomId, title: roomTitle });
    else navigation.popTo('PodDetails', { podId: roomId, title: roomTitle });
  };
  const openProfile = (userId: string) => navigation.navigate('PublicProfile', { userId });

  const [emojiFor, setEmojiFor] = useState<EmojiTarget>(null);
  const [actions, setActions] = useState<MessageActionsTarget | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const listRef = useRef<ScrollView>(null);

  // Follow the newest line (the room opening, a live line, your own send) —
  // never an older page put above the line the reader is on.
  const newestId = messages.at(-1)?.id;
  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [newestId]);

  // The error banner appears without focus moving to it, so say it (4.1.3).
  useEffect(() => {
    if (error) AccessibilityInfo.announceForAccessibility(error);
  }, [error]);

  const handleSelectEmoji = (emoji: string) => {
    if (emojiFor?.type === 'react') fireAndForget(react(emojiFor.id, emoji));
    else composer.setText((prev) => prev + emoji);
    setEmojiFor(null);
  };

  return (
    <YStack flex={1} testID="chat-room-screen">
      <AppBackground />
      {/* `bottom` matters as much as `top` here: the composer is the last child,
          so under the edge-to-edge window it would otherwise sit beneath the
          Android navigation bar. */}
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <ChatRoomHeaderBar
          title={roomTitle}
          onBack={goBack}
          onOpenPod={openLinked}
          actions={
            <ChatMuteButton
              muted={mute.muted}
              mutedUntil={mute.mutedUntil}
              busy={mute.busy}
              onChoose={mute.choose}
            />
          }
        />

        {isClub ? null : (
          <ChatParticipantsPanel
            hosts={hosts}
            participants={participants}
            count={count}
            onOpenProfile={openProfile}
          />
        )}

        <ChatRetentionNotice deletesAt={room.deletesAt} retentionDays={room.retentionDays} />

        {/* Keyboard avoidance so the bottom composer rises above the keyboard
            (Android edge-to-edge no longer resizes the window). */}
        <KeyboardScreen>
          <ChatErrorBanner error={error} onDismiss={() => setError(null)} />

          <ChatMessageList
            listRef={listRef}
            isLoading={room.isLoading}
            messages={messages}
            history={room.history}
            meId={meId}
            onOpenActions={(message) =>
              setActions({ id: message.id, mine: message.user_id === meId })
            }
            onReply={podEnded ? undefined : composer.startReply}
            onOpenProfile={openProfile}
          />

          {emojiFor ? <EmojiBar onSelect={handleSelectEmoji} /> : null}

          {podEnded ? (
            <ChatClosedNotice />
          ) : (
            <>
              {composer.replyTo ? (
                <ChatReplyStrip
                  replyTo={composer.replyTo}
                  mine={composer.replyTo.user_id === meId}
                  onCancel={composer.cancelReply}
                />
              ) : null}
              <MentionSuggestionList members={composer.candidates} onPick={composer.pickMention} />
              <ChatComposer
                value={composer.text}
                onChangeText={composer.setText}
                onSend={() => fireAndForget(composer.send())}
                onPickImage={() => fireAndForget(pickImage())}
                onToggleEmoji={() =>
                  setEmojiFor((prev) => (prev?.type === 'compose' ? null : { type: 'compose' }))
                }
                sending={room.sending}
                inputRef={composer.inputRef}
                onCaret={composer.onCaret}
              />
            </>
          )}
        </KeyboardScreen>
      </SafeAreaView>

      <ChatMessageActionsSheet
        target={actions}
        canModerate={room.canModerate}
        onClose={() => setActions(null)}
        onReact={(id) => setEmojiFor({ type: 'react', id })}
        onReply={podEnded ? undefined : composer.startReply}
        onDelete={(id) => fireAndForget(room.remove(id, t('mweb.chatRoom.deleteFailed')))}
        onReport={setReportId}
      />
      <ReportContentSheet targetId={reportId} kind="MESSAGE" onClose={() => setReportId(null)} />
    </YStack>
  );
}
