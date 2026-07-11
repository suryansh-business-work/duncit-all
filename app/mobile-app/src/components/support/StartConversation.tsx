import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { START_CONVERSATION_GRADIENT } from './gradients';

/** Primary "Start a conversation" CTA → real-time agent chat. RN twin of mWeb's
 * StartConversation. */
export function StartConversation({ onPress }: Readonly<{ onPress: () => void }>) {
  return (
    <XStack
      testID="support-start-chat"
      role="button"
      aria-label="Start a conversation with support"
      onPress={onPress}
      alignItems="center"
      gap={14}
      padding={16}
      borderRadius={18}
      overflow="hidden"
      pressStyle={{ opacity: 0.9 }}
    >
      <LinearGradient
        colors={START_CONVERSATION_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <YStack
        width={44}
        height={44}
        borderRadius={14}
        alignItems="center"
        justifyContent="center"
        backgroundColor="rgba(255,255,255,0.2)"
      >
        <MaterialIcons name="chat-bubble-outline" size={22} color="#ffffff" />
      </YStack>
      <YStack flex={1} gap={2}>
        <Text fontSize={15} fontWeight="900" color="#ffffff">
          Start a conversation
        </Text>
        <Text fontSize={12.5} color="#ffffff" opacity={0.9}>
          Chat with our support team in real time
        </Text>
      </YStack>
      <MaterialIcons name="chevron-right" size={22} color="#ffffff" />
    </XStack>
  );
}
