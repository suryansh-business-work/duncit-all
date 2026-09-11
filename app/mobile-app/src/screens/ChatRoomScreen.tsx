import { useEffect, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Text, XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { useGoBack } from '@/hooks/useGoBack';
import { ChatClosedNotice } from '@/components/chat/ChatClosedNotice';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatMessageBubble } from '@/components/chat/ChatMessageBubble';
import { ChatParticipantsPanel } from '@/components/chat/ChatParticipantsPanel';
import { ChatRoomHeaderBar } from '@/components/chat/ChatRoomHeaderBar';
import { EmojiBar } from '@/components/chat/EmojiBar';
import { ListSkeleton } from '@/components/Skeleton';
import { useChatRoom } from '@/hooks/useChatRoom';
import { useChatParticipants } from '@/hooks/useChat';
import { useMe } from '@/hooks/useMe';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { RefreshScrollView } from '@/components/PullToRefresh';

type EmojiTarget = { type: 'compose' } | { type: 'react'; id: string } | null;

/** Live pod chat — history + realtime messages, with send, image and reactions.
 * RN twin of mWeb's ChatRoomPage. */
export function ChatRoomScreen() {
  const { t } = useTranslation();
  const goBack = useGoBack();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { podId, title } = useRoute<RouteProp<RootStackParamList, 'ChatRoom'>>().params;
  const { messages, podEnded, isLoading, sending, error, setError, sendText, sendImage, react } =
    useChatRoom(podId);
  const { hosts, participants, count } = useChatParticipants(podId);
  const { data: meData } = useMe();
  const meId = meData?.me?.user_id;
  const { onPrimary } = useThemeColors();

  const openPod = () => navigation.navigate('PodDetails', { podId, title });
  const openProfile = (userId: string) => navigation.navigate('PublicProfile', { userId });

  const [text, setText] = useState('');
  const [emojiFor, setEmojiFor] = useState<EmojiTarget>(null);
  const listRef = useRef<ScrollView>(null);

  useEffect(() => {
    /* istanbul ignore next -- native autoscroll; method absent under the test renderer */
    listRef.current?.scrollToEnd?.({ animated: true });
  }, [messages.length]);

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
        <ChatRoomHeaderBar title={title} onBack={goBack} onOpenPod={openPod} />

        <ChatParticipantsPanel
          hosts={hosts}
          participants={participants}
          count={count}
          onOpenProfile={openProfile}
        />

        {/* Keyboard avoidance so the bottom composer rises above the keyboard
            (Android edge-to-edge no longer resizes the window). */}
        <KeyboardScreen>
          {error ? (
            <XStack
              pressStyle={PRESS_STYLE.surface}
              testID="chat-room-error"
              role="button"
              aria-label={t('mweb.chatRoom.dismissError')}
              onPress={() => setError(null)}
              margin={12}
              padding={12}
              borderRadius={14}
              backgroundColor="$danger"
            >
              <Text flex={1} fontSize={13} color="$onPrimary">
                {error}
              </Text>
              <MaterialIcons name="close" size={18} color={onPrimary} />
            </XStack>
          ) : null}

          {isLoading && messages.length === 0 ? (
            <ListSkeleton testID="chat-room-loading" count={5} />
          ) : (
            <RefreshScrollView
              ref={listRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingVertical: 12, gap: 8 }}
            >
              {messages.length === 0 ? (
                <Text
                  testID="chat-room-empty"
                  textAlign="center"
                  color="$muted"
                  paddingVertical={40}
                >
                  No messages yet. Say hello 👋
                </Text>
              ) : (
                messages.map((message) => (
                  <ChatMessageBubble
                    key={message.id}
                    message={message}
                    mine={message.user_id === meId}
                    onReact={(id) => setEmojiFor({ type: 'react', id })}
                  />
                ))
              )}
            </RefreshScrollView>
          )}

          {emojiFor ? <EmojiBar onSelect={handleSelectEmoji} /> : null}

          {podEnded ? (
            <ChatClosedNotice />
          ) : (
            <ChatComposer
              value={text}
              onChangeText={setText}
              onSend={handleSend}
              onPickImage={() => void handlePickImage()}
              onToggleEmoji={() =>
                setEmojiFor((prev) => (prev?.type === 'compose' ? null : { type: 'compose' }))
              }
              sending={sending}
            />
          )}
        </KeyboardScreen>
      </SafeAreaView>
    </YStack>
  );
}
