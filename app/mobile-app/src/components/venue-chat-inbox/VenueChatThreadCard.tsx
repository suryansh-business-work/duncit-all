import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { ChatRoomAvatar } from '@/components/chat/ChatRoomAvatar';
import { ChatUnreadBadge } from '@/components/chat/ChatUnreadBadge';
import { SurfaceCard } from '@/components/SurfaceCard';
import type { VenueChatThreadItem } from '@/hooks/useVenueChatThreads';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime } from '@/utils/date-format';

/** The newest line as the row reads it: the text, "Photo", or "No messages yet". */
function previewOf(row: VenueChatThreadItem, t: ReturnType<typeof useTranslation>['t']) {
  if (row.last_message_is_photo) return t('mweb.venueChat.photo');
  return row.last_message || t('mweb.venueChat.noMessagesYet');
}

/** One venue chat in the inbox — the host's photo, the pod, the newest line,
 * its time and the unread count. mWeb twin: @duncit/ui VenueChatThreadList. */
export function VenueChatThreadCard({
  row,
  onPress,
}: Readonly<{ row: VenueChatThreadItem; onPress: () => void }>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const unread = row.unread_count > 0;
  return (
    <SurfaceCard
      testID={`venue-chat-thread-${row.pod_id}`}
      role="button"
      tabIndex={0}
      aria-label={`${row.pod_title}, ${row.host_name}`}
      onPress={onPress}
      flexDirection="row"
      alignItems="center"
      gap={12}
      padding={12}
      pressStyle={PRESS_STYLE.surface}
    >
      <ChatRoomAvatar coverUrl={row.host_photo} fallbackIcon="forum" />
      <YStack flex={1} gap={4}>
        <Text fontSize={15} fontWeight={unread ? '700' : '600'} color="$color" numberOfLines={1}>
          {row.pod_title}
        </Text>
        <Text fontSize={13} color="$muted" numberOfLines={1}>
          {`${row.host_name} · ${previewOf(row, t)}`}
        </Text>
        {row.last_message_at ? (
          <Text fontSize={11} color="$muted">
            {formatDateTime(row.last_message_at)}
          </Text>
        ) : null}
      </YStack>
      <ChatUnreadBadge count={row.unread_count} testID={`venue-chat-thread-${row.pod_id}-unread`} />
      <MaterialIcons name="chevron-right" size={22} color={muted} />
    </SurfaceCard>
  );
}
