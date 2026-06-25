import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { UserNotification } from '@/hooks/useNotifications';
import { formatRelative } from '@/utils/date-format';

/** A single notification card — chat-style row (avatar · title + preview ·
 * time), with unread cards highlighted by the primary gradient (B3-4).
 * RN twin of the mWeb NotificationsScreen list item. */
export function NotificationRow({
  item,
  onPress,
}: Readonly<{
  item: UserNotification;
  onPress: () => void;
}>) {
  const { onPrimary, primary, muted } = useThemeColors();
  const unread = !item.read_at;
  const notification = item.notification;
  // Unread cards sit on the primary gradient (white ink); read cards sit on the
  // light `$surface` card, so they take the theme ink colour `$color` (B-fix:
  // `undefined` resolved to a near-invisible grey on the surface).
  const titleColor = unread ? '#ffffff' : '$color';
  const bodyColor = unread ? '#ffffff' : '$color';
  const ink = unread ? '#ffffff' : undefined;

  const body = (
    <XStack gap={12} padding={12} alignItems="center">
      <YStack
        width={46}
        height={46}
        borderRadius={23}
        overflow="hidden"
        backgroundColor={unread ? 'rgba(255,255,255,0.22)' : '$primary'}
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
          <Text flex={1} fontSize={15} fontWeight="900" color={titleColor} numberOfLines={2}>
            {notification.title}
          </Text>
          <Text fontSize={11} fontWeight="700" color={ink ?? muted} opacity={unread ? 0.9 : 1}>
            {formatRelative(item.created_at)}
          </Text>
        </XStack>
        <XStack alignItems="center" gap={8}>
          <Text
            flex={1}
            fontSize={13}
            color={bodyColor}
            opacity={unread ? 0.92 : 0.85}
            numberOfLines={2}
          >
            {notification.body}
          </Text>
          {unread ? (
            <YStack
              testID={`notification-new-${item.id}`}
              borderRadius={999}
              backgroundColor="rgba(255,255,255,0.26)"
              paddingHorizontal={9}
              paddingVertical={2}
            >
              <Text fontSize={10.5} fontWeight="900" color="#ffffff">
                NEW
              </Text>
            </YStack>
          ) : null}
          {notification.link_url ? (
            <MaterialIcons name="chevron-right" size={20} color={ink ?? primary} />
          ) : null}
        </XStack>
      </YStack>
    </XStack>
  );

  if (unread) {
    return (
      <XStack
        testID={`notification-${item.id}`}
        role="button"
        onPress={onPress}
        borderRadius={16}
        overflow="hidden"
        pressStyle={{ opacity: 0.9 }}
      >
        <LinearGradient
          colors={['#ff4f73', '#ff7a59']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        >
          {body}
        </LinearGradient>
      </XStack>
    );
  }

  return (
    <XStack
      testID={`notification-${item.id}`}
      role="button"
      onPress={onPress}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      overflow="hidden"
      pressStyle={{ opacity: 0.85 }}
    >
      {body}
    </XStack>
  );
}
