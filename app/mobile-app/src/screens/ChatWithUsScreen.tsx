import { useRef, useState, type ReactNode } from 'react';
import { ScrollView as RNScrollView, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { SupportChatBubble } from '@/components/support-chat/SupportChatBubble';
import { useSupportChat } from '@/hooks/useSupportChat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { toErrorMessage } from '@/utils/errors';

/** Chat with Us — a real-time support chat (text + images) with our team.
 * Mobile twin of mWeb's /live-chat; agent pickup shows as a system bubble. */
export function ChatWithUsScreen() {
  const { messages, isLoading, error, send, uploadImage } = useSupportChat();
  const { muted, onPrimary, color: ink } = useThemeColors();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState('');
  const scrollRef = useRef<RNScrollView>(null);

  const submit = async (attachments: string[] = []) => {
    if (busy || (!text.trim() && attachments.length === 0)) return;
    setBusy(true);
    setSendError('');
    try {
      await send(text, attachments);
      setText('');
      scrollRef.current?.scrollToEnd({ animated: true });
    } catch (e) {
      setSendError(toErrorMessage(e, 'Could not send the message.'));
    } finally {
      setBusy(false);
    }
  };

  const attachImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setSendError('Photo access is needed to attach an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.8,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    setBusy(true);
    setSendError('');
    try {
      const url = await uploadImage(asset);
      setBusy(false);
      await submit([url]);
    } catch (e) {
      setSendError(toErrorMessage(e, 'Could not attach the image.'));
      setBusy(false);
    }
  };

  let chatBody: ReactNode;
  if (isLoading) {
    chatBody = (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner size="large" testID="support-chat-loading" />
      </YStack>
    );
  } else if (error) {
    chatBody = (
      <Text testID="support-chat-error" color="$muted" textAlign="center" padding={24}>
        {error}
      </Text>
    );
  } else {
    chatBody = (
      <ScrollView
        ref={scrollRef}
        flex={1}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.length === 0 ? (
          <Text testID="support-chat-empty" color="$muted" textAlign="center" padding={24}>
            Say hello — our team replies in real time.
          </Text>
        ) : (
          messages.map((m) => <SupportChatBubble key={m.id} message={m} />)
        )}
      </ScrollView>
    );
  }

  return (
    <StackScreen title="Chat with Us" testID="chat-with-us-screen">
      <YStack flex={1}>
        {chatBody}

        {sendError ? (
          <Text
            testID="support-chat-send-error"
            color="$danger"
            fontSize={12}
            paddingHorizontal={16}
          >
            {sendError}
          </Text>
        ) : null}

        <XStack gap={8} padding={12} alignItems="center">
          <XStack
            testID="support-chat-attach"
            role="button"
            aria-label="Attach image"
            onPress={attachImage}
            width={42}
            height={42}
            alignItems="center"
            justifyContent="center"
            borderRadius={21}
            borderWidth={1}
            borderColor="$borderColor"
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="image" size={20} color={muted} />
          </XStack>
          <XStack
            flex={1}
            borderWidth={1}
            borderColor="$borderColor"
            borderRadius={22}
            paddingHorizontal={14}
            alignItems="center"
            minHeight={42}
          >
            <TextInput
              testID="support-chat-input"
              value={text}
              onChangeText={setText}
              placeholder="Type a message…"
              placeholderTextColor={muted}
              style={{ flex: 1, color: ink, paddingVertical: 8 }}
              multiline
            />
          </XStack>
          <XStack
            testID="support-chat-send"
            role="button"
            aria-label="Send message"
            onPress={() => void submit()}
            width={42}
            height={42}
            alignItems="center"
            justifyContent="center"
            borderRadius={21}
            backgroundColor="$primary"
            opacity={busy ? 0.6 : 1}
            pressStyle={{ opacity: 0.8 }}
          >
            <MaterialIcons name="send" size={18} color={onPrimary} />
          </XStack>
        </XStack>
      </YStack>
    </StackScreen>
  );
}
