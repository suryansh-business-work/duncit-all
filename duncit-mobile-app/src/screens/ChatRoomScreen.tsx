import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { ChatMessageBubble } from '@/components/chat/ChatMessageBubble';
import { useMe } from '@/hooks/useMe';
import { usePodMessages } from '@/hooks/useChat';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';

/** Read-only room view — recent messages for a pod. Sending is a follow-up. */
export function ChatRoomScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'ChatRoom'>>();
  const { podId, title } = route.params;
  const { messages, isLoading } = usePodMessages(podId);
  const { data: meData } = useMe();
  const { color: ink } = useThemeColors();
  const meId = meData?.me?.user_id;

  return (
    <YStack flex={1} testID="chat-room-screen">
      <AppBackground />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <XStack alignItems="center" gap={8} paddingHorizontal={12} paddingVertical={8}>
          <XStack
            testID="chat-room-back"
            role="button"
            aria-label="Go back"
            onPress={() => navigation.goBack()}
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

        {isLoading && messages.length === 0 ? (
          <YStack flex={1} alignItems="center" justifyContent="center" testID="chat-room-loading">
            <Spinner color="$primary" size="large" />
          </YStack>
        ) : (
          <ScrollView flex={1} contentContainerStyle={{ paddingVertical: 12, gap: 8 }}>
            {messages.length === 0 ? (
              <Text testID="chat-room-empty" textAlign="center" color="$muted" paddingVertical={40}>
                No messages yet.
              </Text>
            ) : (
              messages.map((message) => (
                <ChatMessageBubble
                  key={message.id}
                  message={message}
                  mine={message.user_id === meId}
                />
              ))
            )}
          </ScrollView>
        )}

        <Text textAlign="center" fontSize={11} color="$muted" paddingVertical={8}>
          Read-only preview — live messaging coming soon.
        </Text>
      </SafeAreaView>
    </YStack>
  );
}
