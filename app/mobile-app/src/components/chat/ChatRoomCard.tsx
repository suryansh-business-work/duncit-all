import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { semantic } from '@duncit/auth-tokens';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { ChatRoom } from '@/stores/chat.store';
import { podStatus, type PodStatus } from '@/utils/pod-format';

const STATUS_META: Record<PodStatus, { label: string; color: string }> = {
  LIVE: { label: 'Live', color: semantic.success },
  UPCOMING: { label: 'Upcoming', color: semantic.info },
  ENDED: { label: 'Previous', color: semantic.warning },
};

/** A chat-room row in the Chats thread list — cover, title, member count and the
 * linked pod's status (Upcoming / Live / Previous). */
export function ChatRoomCard({ room, onPress }: Readonly<{ room: ChatRoom; onPress: () => void }>) {
  const { onPrimary, muted } = useThemeColors();
  const members = room.pod_attendees.length;
  const status = STATUS_META[podStatus(room.pod_date_time, room.pod_end_date_time)];

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
          <AppImage
            source={{ uri: room.cover_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <MaterialIcons name="forum" size={26} color={onPrimary} />
        )}
      </YStack>
      <YStack flex={1} gap={4}>
        <Text fontSize={15.5} fontWeight="900" color="$color" numberOfLines={1}>
          {room.pod_title}
        </Text>
        <XStack alignItems="center" gap={8}>
          <Text fontSize={12.5} fontWeight="600" color="$muted" numberOfLines={1}>
            {members} {members === 1 ? 'member' : 'members'}
          </Text>
          <XStack
            testID={`chat-room-status-${room.id}`}
            paddingHorizontal={8}
            paddingVertical={2}
            borderRadius={999}
            backgroundColor={status.color}
          >
            <Text fontSize={10} fontWeight="900" color="#ffffff">
              {status.label}
            </Text>
          </XStack>
        </XStack>
      </YStack>
      <MaterialIcons name="chevron-right" size={22} color={muted} />
    </XStack>
  );
}
