import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Chat with Us — a single entry point into the real-time agent chat. The ticket
 * inbox and the "New ticket" shortcut that used to live here have been removed:
 * this screen now offers only "Chat live with an agent".
 */
export function ChatWithUsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { onPrimary, color: ink } = useThemeColors();

  return (
    <StackScreen title="Chat with Us" testID="chat-with-us-screen">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        <Text testID="chat-inbox-subtitle" fontSize={13} color="$muted">
          Real-time chat with our support team
        </Text>
        <XStack
          testID="chat-live-card"
          role="button"
          aria-label="Chat live with an agent"
          onPress={() => navigation.navigate('LiveChat')}
          alignItems="center"
          gap={12}
          padding={14}
          borderRadius={16}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
          pressStyle={{ opacity: 0.85 }}
        >
          <YStack
            width={44}
            height={44}
            borderRadius={14}
            backgroundColor="$primary"
            alignItems="center"
            justifyContent="center"
          >
            <MaterialIcons name="forum" size={22} color={onPrimary} />
          </YStack>
          <YStack flex={1} gap={2}>
            <Text fontSize={15} fontWeight="900" color="$color">
              Chat live with an agent
            </Text>
            <Text fontSize={12.5} color="$muted">
              Get real-time answers without raising a ticket.
            </Text>
          </YStack>
          <MaterialIcons name="chevron-right" size={22} color={ink} />
        </XStack>
      </ScrollView>
    </StackScreen>
  );
}
