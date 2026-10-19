import { useTranslation } from '@/hooks/useTranslation';
import { ChatRoomAvatar } from '@/components/chat/ChatRoomAvatar';
import { ChatUnreadBadge } from '@/components/chat/ChatUnreadBadge';

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
  // $success / $warning are mode-aware fills; their ink is the semantic on-colour
  // (white in light, dark ink in dark), never the CTA's $onPrimary.
  LIVE: { label: t('mweb.common.live'), bg: '$success', fg: '$onSuccess' },
  UPCOMING: { label: t('mweb.common.upcoming'), bg: '$warning', fg: '$onSuccess' },
  ENDED: { label: t('mweb.common.previous'), bg: '$soft', fg: '$color' },
});

/** A chat-room row in the Chats thread list — cover, title, member count and the
 * linked pod's status (Upcoming / Live / Previous). */
export function ChatRoomCard({ room, onPress }: Readonly<{ room: ChatRoom; onPress: () => void }>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  // Identity, deliberately: this counts who is IN the chat, and a multi-seat
  // buyer is one person in it. Do not seat-adjust it the way occupancy was.
  const members = room.pod_attendees.length;
  const status = statusMeta(t)[podStatus(room.pod_date_time, room.pod_end_date_time)];

  return (
    <SurfaceCard
      testID={`chat-room-${room.id}`}
      role="button"
      tabIndex={0}
      aria-label={`${room.pod_title}, ${status.label}`}
      onPress={onPress}
      flexDirection="row"
      alignItems="center"
      gap={12}
      padding={12}
      pressStyle={PRESS_STYLE.surface}
    >
      <ChatRoomAvatar coverUrl={room.cover_url} fallbackIcon="forum" />
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
      <ChatUnreadBadge count={room.unread_count} testID={`chat-room-${room.id}-unread`} />
      <MaterialIcons name="chevron-right" size={22} color={muted} />
    </SurfaceCard>
  );
}
