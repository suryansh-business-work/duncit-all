import { useTranslation } from '@/hooks/useTranslation';
import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { ChatRoom } from '@/stores/chat.store';
import { podStatus, type PodStatus } from '@/utils/pod-format';
import type { Translate } from '@/i18n/fallback';
import { PRESS_STYLE } from '@duncit/buttons-native';

type StatusMeta = { label: string; bg: string; fg: string };

/** The same filled tones as mWeb's status chip (podStatusChip). */
const statusMeta = (t: Translate): Record<PodStatus, StatusMeta> => ({
  LIVE: { label: t('mweb.common.live'), bg: '$success', fg: '$onPrimary' },
  UPCOMING: { label: t('mweb.common.upcoming'), bg: '$warning', fg: '$onPrimary' },
  ENDED: { label: t('mweb.common.previous'), bg: '$soft', fg: '$color' },
});

/** A chat-room row in the Chats thread list — cover, title, member count and the
 * linked pod's status (Upcoming / Live / Previous). */
export function ChatRoomCard({ room, onPress }: Readonly<{ room: ChatRoom; onPress: () => void }>) {
  const { t } = useTranslation();
  const { onPrimary, muted } = useThemeColors();
  // Identity, deliberately: this counts who is IN the chat, and a multi-seat
  // buyer is one person in it. Do not seat-adjust it the way occupancy was.
  const members = room.pod_attendees.length;
  const status = statusMeta(t)[podStatus(room.pod_date_time, room.pod_end_date_time)];

  return (
    <SurfaceCard
      testID={`chat-room-${room.id}`}
      role="button"
      aria-label={room.pod_title}
      onPress={onPress}
      flexDirection="row"
      alignItems="center"
      gap={12}
      padding={12}
      pressStyle={PRESS_STYLE.surface}
    >
      <YStack
        width={48}
        height={48}
        borderRadius={12}
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
          <MaterialIcons name="forum" size={24} color={onPrimary} />
        )}
      </YStack>
      <YStack flex={1} gap={4}>
        <Text fontSize={15} fontWeight="600" color="$color" numberOfLines={1}>
          {room.pod_title}
        </Text>
        <XStack alignItems="center" gap={8}>
          <Text fontSize={13} color="$muted" numberOfLines={1}>
            {members} {members === 1 ? 'member' : 'members'}
          </Text>
          <XStack
            testID={`chat-room-status-${room.id}`}
            paddingHorizontal={8}
            paddingVertical={2}
            borderRadius={999}
            backgroundColor={status.bg}
          >
            <Text fontSize={10} fontWeight="600" color={status.fg}>
              {status.label}
            </Text>
          </XStack>
        </XStack>
      </YStack>
      <MaterialIcons name="chevron-right" size={22} color={muted} />
    </SurfaceCard>
  );
}
