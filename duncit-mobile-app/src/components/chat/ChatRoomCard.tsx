import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { ChatRoom } from '@/stores/chat.store';

/** A chat-room row in the Chats thread list — cover, title and member count. */
export function ChatRoomCard({ room, onPress }: { room: ChatRoom; onPress: () => void }) {
  const { onPrimary, muted } = useThemeColors();
  const members = room.pod_attendees.length;

  return (
    <XStack
      testID={`chat-room-${room.id}`}
      role="button"
      aria-label={room.pod_title}
      onPress={onPress}
      alignItems="center"
      gap={14}
      padding={12}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      pressStyle={{ opacity: 0.9 }}
    >
      <YStack
        width={54}
        height={54}
        borderRadius={16}
        overflow="hidden"
        backgroundColor="$primary"
        alignItems="center"
        justifyContent="center"
      >
        {room.cover_url ? (
          <Image
            source={{ uri: room.cover_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <MaterialIcons name="forum" size={26} color={onPrimary} />
        )}
      </YStack>
      <YStack flex={1} gap={2}>
        <Text fontSize={15.5} fontWeight="900" color="$color" numberOfLines={1}>
          {room.pod_title}
        </Text>
        <Text fontSize={12.5} fontWeight="600" color="$muted" numberOfLines={1}>
          {members} {members === 1 ? 'member' : 'members'}
        </Text>
      </YStack>
      <MaterialIcons name="chevron-right" size={22} color={muted} />
    </XStack>
  );
}
