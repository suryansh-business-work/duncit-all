import { AppImage } from '@/components/AppImage';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { followRequestRowState } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { UserNotification } from '@/hooks/useNotifications';
import { formatRelative } from '@/utils/date-format';
import { notificationIconName } from '@/utils/notification-icon';
import { FollowRequestActions } from './FollowRequestActions';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** A single notification row — icon disc · title + preview · time, with an
 * accent dot while unread. The list groups the rows inside one card.
 * RN twin of the mWeb NotificationsScreen list item. */
export function NotificationRow({
  item,
  busy,
  onPress,
  onAnswered,
}: Readonly<{
  item: UserNotification;
  /** True while this row's mark-read is in flight — the row is the only thing
   * that should look busy, not the whole list. */
  busy: boolean;
  onPress: () => void;
  /** Re-read the inbox once an inline action changes something. */
  onAnswered?: () => void;
}>) {
  const { accent, muted } = useThemeColors();
  const unread = !item.read_at;
  const notification = item.notification;
  // Contextual icon by notification type (falls back to the bell) instead of
  // repeating a generic bell on every row.
  const fallbackIcon = notificationIconName(notification.title);
  // Hoisted to nesting 0 (rule 26g), and the same decision the buttons below
  // make so the two cannot disagree: an actionable row ends in its buttons, and
  // the "open me" chevron would be a second, competing affordance. A
  // new-follower row the viewer already follows back renders no buttons, so it
  // keeps its chevron.
  const rowState = followRequestRowState({
    actionType: notification.action_type,
    requestId: notification.action_ref_id,
    status: notification.action_status,
    followBackStatus: notification.follow_back_status,
    actorId: notification.action_actor_id,
  });
  const showChevron = !busy && !!notification.link_url && rowState === 'HIDDEN';

  return (
    <XStack
      testID={`notification-${item.id}`}
      role="button"
      aria-busy={busy}
      onPress={busy ? undefined : onPress}
      opacity={busy ? 0.6 : 1}
      gap={12}
      paddingHorizontal={16}
      paddingVertical={14}
      alignItems="flex-start"
      pressStyle={PRESS_STYLE.row}
    >
      <YStack
        width={40}
        height={40}
        borderRadius={20}
        overflow="hidden"
        backgroundColor="$soft"
        alignItems="center"
        justifyContent="center"
      >
        {notification.image_url ? (
          <AppImage
            source={{ uri: notification.image_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <MaterialIcons name={fallbackIcon} size={20} color={accent} />
        )}
      </YStack>
      <YStack flex={1} gap={2}>
        <XStack alignItems="center" gap={6}>
          <Text flex={1} fontSize={14} fontWeight="600" color="$color" numberOfLines={2}>
            {notification.title}
          </Text>
          <Text fontSize={12} color="$muted">
            {formatRelative(item.created_at)}
          </Text>
          {unread ? (
            <YStack
              testID={`notification-new-${item.id}`}
              width={8}
              height={8}
              borderRadius={4}
              backgroundColor="$accent"
            />
          ) : null}
        </XStack>
        <XStack alignItems="center" gap={8}>
          <Text flex={1} fontSize={13} color="$muted" numberOfLines={2}>
            {notification.body}
          </Text>
          {busy ? <Spinner size="small" color={muted} /> : null}
          {showChevron ? <MaterialIcons name="chevron-right" size={20} color={muted} /> : null}
        </XStack>
        <FollowRequestActions
          actionType={notification.action_type}
          requestId={notification.action_ref_id}
          status={notification.action_status}
          actorId={notification.action_actor_id}
          followBackStatus={notification.follow_back_status}
          unreadRow={unread}
          onAnswered={() => onAnswered?.()}
        />
      </YStack>
    </XStack>
  );
}
