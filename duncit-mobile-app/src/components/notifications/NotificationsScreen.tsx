import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { UserNotification } from '@/hooks/useNotifications';
import { NotificationRow } from './NotificationRow';

export interface NotificationsScreenProps {
  open: boolean;
  onClose: () => void;
  notifs: UserNotification[];
  unreadCount: number;
  onNotifClick: (item: UserNotification) => void;
  onMarkAll: () => void;
}

/** Full-screen notifications list — RN twin of mWeb's <NotificationsScreen/>.
 * Header with unread count + mark-all, a live banner, then the list. */
export function NotificationsScreen({
  open,
  onClose,
  notifs,
  unreadCount,
  onNotifClick,
  onMarkAll,
}: NotificationsScreenProps) {
  const { color, primary } = useThemeColors();

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} testID="notifications-screen">
          <AppBackground />
          <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
            <XStack alignItems="center" gap={10} paddingHorizontal={12} paddingVertical={10}>
              <XStack
                testID="notifications-close"
                role="button"
                aria-label="Close notifications"
                onPress={onClose}
                width={40}
                height={40}
                alignItems="center"
                justifyContent="center"
                borderRadius={20}
                backgroundColor="$surface"
                pressStyle={{ opacity: 0.7 }}
              >
                <MaterialIcons name="close" size={20} color={color} />
              </XStack>
              <YStack flex={1}>
                <Text fontSize={22} fontWeight="900" color="$color">
                  Notifications
                </Text>
                <Text fontSize={12} fontWeight="800" color="$muted">
                  {unreadCount > 0
                    ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}`
                    : 'All caught up'}
                </Text>
              </YStack>
              <XStack
                testID="notifications-mark-all"
                role="button"
                aria-label="Mark all as read"
                aria-disabled={unreadCount === 0}
                onPress={unreadCount === 0 ? undefined : onMarkAll}
                width={40}
                height={40}
                alignItems="center"
                justifyContent="center"
                borderRadius={20}
                backgroundColor="$surface"
                opacity={unreadCount === 0 ? 0.5 : 1}
                pressStyle={{ opacity: 0.7 }}
              >
                <MaterialIcons name="done-all" size={20} color={color} />
              </XStack>
            </XStack>

            <XStack
              marginHorizontal={12}
              marginBottom={10}
              padding={14}
              borderRadius={16}
              alignItems="center"
              gap={12}
              backgroundColor="$surface"
              borderWidth={1}
              borderColor="$borderColor"
            >
              <MaterialIcons name="notifications-active" size={26} color={primary} />
              <YStack flex={1}>
                <Text fontSize={14} fontWeight="900" color="$color">
                  Duncit updates are live
                </Text>
                <Text fontSize={12} color="$muted">
                  Pods, clubs, chats and account updates in one place.
                </Text>
              </YStack>
              <XStack
                borderRadius={999}
                backgroundColor="$primary"
                paddingHorizontal={10}
                paddingVertical={3}
              >
                <Text fontSize={12} fontWeight="900" color="$onPrimary">
                  {notifs.length}
                </Text>
              </XStack>
            </XStack>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24, gap: 8 }}
            >
              {notifs.length === 0 ? (
                <YStack
                  padding={24}
                  borderRadius={16}
                  backgroundColor="$surface"
                  alignItems="center"
                >
                  <Text fontSize={14} color="$muted">
                    No notifications yet.
                  </Text>
                </YStack>
              ) : (
                notifs.map((item) => (
                  <NotificationRow key={item.id} item={item} onPress={() => onNotifClick(item)} />
                ))
              )}
            </ScrollView>
          </SafeAreaView>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
