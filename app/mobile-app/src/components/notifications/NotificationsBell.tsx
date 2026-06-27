import { useState } from 'react';
import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useNotifications, type UserNotification } from '@/hooks/useNotifications';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';
import { NotificationsScreen } from './NotificationsScreen';

/** Param-less in-app deep-link path → React Navigation screen (notification link_url routing). */
const IN_APP_ROUTES: Record<string, 'Earn'> = { '/earn': 'Earn' };

/** Header bell with unread badge — RN twin of mWeb's <HeaderNotificationsBell/>.
 * Opens the full-screen notifications list and owns the data + read mutations. */
export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const { color, onPrimary } = useThemeColors();
  const { notifs, unreadCount, refetch, markRead, markAll } = useNotifications();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const onOpen = () => {
    setOpen(true);
    refetch();
  };

  const openLink = (link: string) => {
    if (link.startsWith('http')) {
      setOpen(false);
      void Linking.openURL(link);
      return;
    }
    const route = IN_APP_ROUTES[link];
    if (route) {
      setOpen(false);
      navigation.navigate(route);
    }
  };

  const onNotifClick = async (item: UserNotification) => {
    await markRead(item);
    const link = item.notification.link_url;
    if (link) openLink(link);
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
