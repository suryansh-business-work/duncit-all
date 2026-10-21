import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ScrollView } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { isVenueChatUnavailable, venueChatCounterpart } from '@duncit/utils';

import { AppBackground } from '@/components/AppBackground';
import { EmptyState } from '@/components/EmptyState';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatErrorBanner } from '@/components/chat/ChatErrorBanner';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { EmojiBar } from '@/components/chat/EmojiBar';
import { VenueChatHeaderBar } from '@/components/chat/VenueChatHeaderBar';
import { useChatImagePicker } from '@/hooks/useChatImagePicker';
import { useMe } from '@/hooks/useMe';
import { useTranslation } from '@/hooks/useTranslation';
import { useVenueChat } from '@/hooks/useVenueChat';
import { useVenueChatSocket } from '@/hooks/useVenueChatSocket';
import type { RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';

/** A thread that cannot open: not this user's (go back) or failed to load (retry). */
function VenueChatClosed({
  unavailable,
  onBack,
  onRetry,
}: Readonly<{ unavailable: boolean; onBack: () => void; onRetry: () => void }>) {
  const { t } = useTranslation();
  if (unavailable) {
    return (
      <EmptyState
        testID="venue-chat-unavailable"
        icon="chat-bubble-outline"
        title={t('mweb.venueChat.unavailable')}
        actionLabel={t('mweb.common.goBack')}
        onAction={onBack}
      />
    );
  }
  return (
    <EmptyState
      testID="venue-chat-failed"
      icon="error-outline"
      title={t('mweb.venueChat.loadFailed')}
      actionLabel={t('mweb.venueChat.retry')}
      onAction={onRetry}
    />
  );
}

/** `/venue-chat/:podId` — the private thread between a pod's hosts and the venue
 * it is booked at: the group chat's list, bubbles and composer, with the other
 * side in the header. RN twin of mWeb's VenueChatPage. */
export function VenueChatScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { podId } = useRoute<RouteProp<RootStackParamList, 'VenueChat'>>().params;
  const chat = useVenueChat(podId);
  const { room, messages, error, setError } = chat;
  const meId = useMe().data?.me?.user_id;
  const venueSide = room?.my_side === 'VENUE';
  const pickImage = useChatImagePicker({ sendImage: chat.sendImage, onError: setError });
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const listRef = useRef<ScrollView>(null);

  useVenueChatSocket({
    podId: room?.pod_id ?? null,
    onLine: (line) => chat.addLines([line]),
    onJoinFailed: (code) =>
      setError(
        isVenueChatUnavailable(code)
          ? t('mweb.venueChat.unavailable')
          : t('mweb.venueChat.joinFailed'),
      ),
  });

  // Follow the newest line — never an older page put above the line being read.
  const newestId = messages.at(-1)?.id;
  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [newestId]);

  // The error banner appears without focus moving to it, so say it (4.1.3).
  useEffect(() => {
    if (error) AccessibilityInfo.announceForAccessibility(error);
  }, [error]);

  // Back lands where each side opened the thread from.
  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate(venueSide ? 'VenuePods' : 'HostManage');
  };
  const send = async () => {
    if (await chat.sendText(text)) setText('');
  };
  const closed = !chat.isLoading && (chat.loadFailed || !room);

  return (
    <YStack flex={1} testID="venue-chat-screen">
      <AppBackground />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <VenueChatHeaderBar
          counterpart={room ? venueChatCounterpart(room) : null}
          venueSide={venueSide}
          onBack={goBack}
        />
        {closed ? (
          <VenueChatClosed unavailable={chat.unavailable} onBack={goBack} onRetry={chat.reload} />
        ) : (
          <KeyboardScreen>
            <ChatErrorBanner error={error} onDismiss={() => setError(null)} />
            <ChatMessageList
              listRef={listRef}
              isLoading={chat.isLoading}
              messages={messages}
              history={chat.history}
              meId={meId}
              onOpenProfile={(userId) => navigation.navigate('PublicProfile', { userId })}
              emptyText={venueSide ? t('mweb.venueChat.emptyVenue') : t('mweb.venueChat.emptyHost')}
            />
            {emojiOpen ? (
              <EmojiBar
                onSelect={(emoji) => {
                  setText((prev) => prev + emoji);
                  setEmojiOpen(false);
                }}
              />
            ) : null}
            <ChatComposer
              value={text}
              onChangeText={setText}
              onSend={() => fireAndForget(send())}
              onPickImage={() => fireAndForget(pickImage())}
              onToggleEmoji={() => setEmojiOpen((open) => !open)}
              sending={chat.sending}
            />
          </KeyboardScreen>
        )}
      </SafeAreaView>
    </YStack>
  );
}
