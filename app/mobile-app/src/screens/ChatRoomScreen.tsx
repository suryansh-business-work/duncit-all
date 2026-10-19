import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ScrollView } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { useGoBack } from '@/hooks/useGoBack';
import { ChatClosedNotice } from '@/components/chat/ChatClosedNotice';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatErrorBanner } from '@/components/chat/ChatErrorBanner';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import {
  ChatMessageActionsSheet,
  type MessageActionsTarget,
} from '@/components/chat/ChatMessageActionsSheet';
import { ChatParticipantsPanel } from '@/components/chat/ChatParticipantsPanel';
import { ChatRetentionNotice } from '@/components/chat/ChatRetentionNotice';
import { ChatRoomHeaderBar } from '@/components/chat/ChatRoomHeaderBar';
import { EmojiBar } from '@/components/chat/EmojiBar';
import { ReportContentSheet } from '@/components/content-report/ReportContentSheet';
import { useChatRoom } from '@/hooks/useChatRoom';
import { useChatParticipants } from '@/hooks/useChat';
import { useMe } from '@/hooks/useMe';
import type { RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';
import { useTranslation } from '@/hooks/useTranslation';

type EmojiTarget = { type: 'compose' } | { type: 'react'; id: string } | null;

/** Live chat — a pod's room (`podId`) or a club's (`clubId`): history + realtime
 * messages, with send, image, reactions, delete and report. RN twin of mWeb's
 * ChatRoomPage. */
export function ChatRoomScreen() {
  const { t } = useTranslation();
  const goBack = useGoBack();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { podId, clubId, title } = useRoute<RouteProp<RootStackParamList, 'ChatRoom'>>().params;
  const isClub = !!clubId;
  const roomId = clubId ?? podId ?? '';
  const room = useChatRoom(roomId, isClub ? 'CLUB' : 'POD');
  const { messages, podEnded, error, setError, sendText, sendImage, react } = room;
  const { hosts, participants, count } = useChatParticipants(isClub ? '' : roomId);
  const { data: meData } = useMe();
  const meId = meData?.me?.user_id;

  const openLinked = () => {
    if (isClub)
      navigation.navigate('ClubDetails', { clubId: roomId, title: room.roomTitle ?? title });
    else navigation.navigate('PodDetails', { podId: roomId, title });
  };
  const openProfile = (userId: string) => navigation.navigate('PublicProfile', { userId });

  const [text, setText] = useState('');
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

  const handleSend = () => {
    sendText(text);
    setText('');
  };

  const handleSelectEmoji = (emoji: string) => {
    if (emojiFor?.type === 'react') fireAndForget(react(emojiFor.id, emoji));
    else setText((prev) => prev + emoji);
    setEmojiFor(null);
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t('mweb.chatRoom.photoAccessIsNeededToSend'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.8,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    await sendImage({ base64: asset.base64, fileName: asset.fileName, mimeType: asset.mimeType });
  };

  return (
    <YStack flex={1} testID="chat-room-screen">
      <AppBackground />
      {/* `bottom` matters as much as `top` here: the composer is the last child,
          so under the edge-to-edge window it would otherwise sit beneath the
          Android navigation bar. */}
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <ChatRoomHeaderBar title={room.roomTitle ?? title} onBack={goBack} onOpenPod={openLinked} />

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
          />

          {emojiFor ? <EmojiBar onSelect={handleSelectEmoji} /> : null}

          {podEnded ? (
            <ChatClosedNotice />
          ) : (
            <ChatComposer
              value={text}
              onChangeText={setText}
              onSend={handleSend}
              onPickImage={() => fireAndForget(handlePickImage())}
              onToggleEmoji={() =>
                setEmojiFor((prev) => (prev?.type === 'compose' ? null : { type: 'compose' }))
              }
              sending={room.sending}
            />
          )}
        </KeyboardScreen>
      </SafeAreaView>

      <ChatMessageActionsSheet
        target={actions}
        canModerate={room.canModerate}
        onClose={() => setActions(null)}
        onReact={(id) => setEmojiFor({ type: 'react', id })}
        onDelete={(id) => fireAndForget(room.remove(id, t('mweb.chatRoom.deleteFailed')))}
        onReport={setReportId}
      />
      <ReportContentSheet targetId={reportId} kind="MESSAGE" onClose={() => setReportId(null)} />
    </YStack>
  );
}
