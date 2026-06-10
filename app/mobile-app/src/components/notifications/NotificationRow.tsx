import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { UserNotification } from '@/hooks/useNotifications';
import { formatRelative } from '@/utils/date-format';

/** A single notification card — read/unread styling, avatar, title/body, time.
 * RN twin of the mWeb NotificationsScreen list item. */
export function NotificationRow({
  item,
  onPress,
}: Readonly<{
  item: UserNotification;
  onPress: () => void;
}>) {
  const { onPrimary, primary } = useThemeColors();
  const unread = !item.read_at;
  const notification = item.notification;

  return (
    <XStack
      testID={`notification-${item.id}`}
      role="button"
      onPress={onPress}
      gap={12}
      padding={12}
      borderRadius={16}
      borderWidth={1}
      borderColor={unread ? '$primary' : '$borderColor'}
      backgroundColor="$surface"
      alignItems="center"
      pressStyle={{ opacity: 0.85 }}
    >
      <YStack
        width={46}
        height={46}
        borderRadius={23}
        overflow="hidden"
        backgroundColor="$primary"
        alignItems="center"
        justifyContent="center"
      >
        {notification.image_url ? (
          <Image
            source={{ uri: notification.image_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <MaterialIcons name="notifications-active" size={22} color={onPrimary} />
        )}
      </YStack>
      <YStack flex={1} gap={2}>
        <XStack alignItems="center" gap={6}>
          {unread ? (
            <YStack width={8} height={8} borderRadius={4} backgroundColor="$primary" />
          ) : null}
          <Text flex={1} fontSize={15} fontWeight="900" color="$color" numberOfLines={1}>
            {notification.title}
          </Text>
        </XStack>
        <Text fontSize={13} color="$muted" numberOfLines={2}>
          {notification.body}
        </Text>
        <Text fontSize={11} fontWeight="700" color="$muted">
          {formatRelative(item.created_at)} ago
        </Text>
      </YStack>
      {notification.link_url ? (
        <MaterialIcons name="arrow-forward" size={18} color={primary} />
      ) : null}
    </XStack>
  );
}
