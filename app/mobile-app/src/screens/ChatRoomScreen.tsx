import { useEffect, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Text, XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { useGoBack } from '@/hooks/useGoBack';
import { ChatClosedNotice } from '@/components/chat/ChatClosedNotice';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatMessageBubble } from '@/components/chat/ChatMessageBubble';
import { EmojiBar } from '@/components/chat/EmojiBar';
import { ListSkeleton } from '@/components/Skeleton';
import { useChatRoom } from '@/hooks/useChatRoom';
import { useMe } from '@/hooks/useMe';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';

type EmojiTarget = { type: 'compose' } | { type: 'react'; id: string } | null;

/** Live pod chat — history + realtime messages, with send, image and reactions.
 * RN twin of mWeb's ChatRoomPage. */
export function ChatRoomScreen() {
  const goBack = useGoBack();
  const { podId, title } = useRoute<RouteProp<RootStackParamList, 'ChatRoom'>>().params;
  const { messages, podEnded, isLoading, sending, error, setError, sendText, sendImage, react } =
    useChatRoom(podId);
  const { data: meData } = useMe();
  const meId = meData?.me?.user_id;
  const { color: ink } = useThemeColors();

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
    if (emojiFor?.type === 'react') void react(emojiFor.id, emoji);
    else setText((prev) => prev + emoji);
    setEmojiFor(null);
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo access is needed to send an image.');
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
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <XStack alignItems="center" gap={8} paddingHorizontal={12} paddingVertical={8}>
          <XStack
            testID="chat-room-back"
            role="button"
            aria-label="Go back"
            onPress={goBack}
            width={40}
            height={40}
            alignItems="center"
            justifyContent="center"
            borderRadius={20}
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="arrow-back" size={22} color={ink} />
          </XStack>
          <Text fontSize={18} fontWeight="800" color="$color" numberOfLines={1} flex={1}>
            {title}
          </Text>
        </XStack>

        {error ? (
          <XStack
            testID="chat-room-error"
            role="button"
            aria-label="Dismiss error"
            onPress={() => setError(null)}
            margin={12}
            padding={10}
            borderRadius={10}
            backgroundColor="$danger"
          >
            <Text flex={1} fontSize={13} color="white">
              {error}
            </Text>
            <MaterialIcons name="close" size={18} color="white" />
          </XStack>
        ) : null}

        {isLoading && messages.length === 0 ? (
          <ListSkeleton testID="chat-room-loading" count={5} />
        ) : (
          <ScrollView
            ref={listRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingVertical: 12, gap: 8 }}
          >
            {messages.length === 0 ? (
              <Text testID="chat-room-empty" textAlign="center" color="$muted" paddingVertical={40}>
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
          </ScrollView>
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
      </SafeAreaView>
    </YStack>
  );
}
