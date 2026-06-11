import { useState } from 'react';
import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useNotifications, type UserNotification } from '@/hooks/useNotifications';
import { useThemeColors } from '@/hooks/useThemeColors';
import { NotificationsScreen } from './NotificationsScreen';

/** Header bell with unread badge — RN twin of mWeb's <HeaderNotificationsBell/>.
 * Opens the full-screen notifications list and owns the data + read mutations. */
export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const { color, onPrimary } = useThemeColors();
  const { notifs, unreadCount, refetch, markRead, markAll } = useNotifications();

  const onOpen = () => {
    setOpen(true);
    refetch();
  };

  const onNotifClick = async (item: UserNotification) => {
    await markRead(item);
    const link = item.notification.link_url;
    if (link?.startsWith('http')) {
      setOpen(false);
      Linking.openURL(link);
    }
  };

  return (
    <>
      <XStack
        testID="notifications-bell"
        role="button"
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
        onPress={onOpen}
        width={40}
        height={40}
        alignItems="center"
        justifyContent="center"
      >
        <MaterialIcons name="notifications-none" size={24} color={color} />
        {unreadCount > 0 ? (
          <YStack
            position="absolute"
            top={4}
            right={4}
            minWidth={16}
            height={16}
            borderRadius={8}
            paddingHorizontal={3}
            backgroundColor="$danger"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={9} fontWeight="900" color={onPrimary}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </YStack>
        ) : null}
      </XStack>
      <NotificationsScreen
        open={open}
        onClose={() => setOpen(false)}
        notifs={notifs}
        unreadCount={unreadCount}
        onNotifClick={onNotifClick}
        onMarkAll={markAll}
      />
    </>
  );
}
