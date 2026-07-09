import { useState } from 'react';
import { FlatList, Modal, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useNotificationPrefsStore } from '@/stores/notification-prefs.store';
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
}: Readonly<NotificationsScreenProps>) {
  const { color, primary } = useThemeColors();
  const notifEnabled = useNotificationPrefsStore((s) => s.enabled);
  const setNotifEnabled = useNotificationPrefsStore((s) => s.setEnabled);
  // Confirm before flipping the master notification switch (B2-#8).
  const [pendingToggle, setPendingToggle] = useState<boolean | null>(null);
  // Derive unread from the loaded items so the header can't say "All caught up"
  // while unread rows are visible; fall back to the count when items lag (BUG-5).
  const liveUnread = notifs.filter((item) => !item.read_at).length || unreadCount;

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
                  {liveUnread > 0
                    ? `${liveUnread} unread update${liveUnread === 1 ? '' : 's'}`
                    : 'All caught up'}
                </Text>
              </YStack>
              <XStack
                testID="notifications-mark-all"
                role="button"
                aria-label="Mark all as read"
                aria-disabled={liveUnread === 0}
                onPress={liveUnread === 0 ? undefined : onMarkAll}
                width={40}
                height={40}
                alignItems="center"
                justifyContent="center"
                borderRadius={20}
                backgroundColor="$surface"
                opacity={liveUnread === 0 ? 0.5 : 1}
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
                  Never Miss an Update
                </Text>
                <Text fontSize={12} color="$muted">
                  Get real-time updates about your Pods, Clubs, Host activities, Chats, and
                  Account—all in one place.
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

            <XStack
              marginHorizontal={12}
              marginBottom={10}
              paddingHorizontal={14}
              paddingVertical={10}
              borderRadius={16}
              alignItems="center"
              gap={12}
              backgroundColor="$surface"
              borderWidth={1}
              borderColor="$borderColor"
            >
              <MaterialIcons name="notifications" size={20} color={color} />
              <Text flex={1} fontSize={13.5} fontWeight="800" color="$color">
                Allow notifications
              </Text>
              <Switch
                testID="notifications-allow-switch"
                aria-label="Allow notifications"
                value={notifEnabled}
                onValueChange={(next) => setPendingToggle(next)}
                trackColor={{ true: primary }}
              />
            </XStack>

            <FlatList
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24, gap: 8 }}
              data={notifs}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <NotificationRow item={item} onPress={() => onNotifClick(item)} />
              )}
              ListEmptyComponent={
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
              }
            />
          </SafeAreaView>
        </YStack>
        <ConfirmDialog
          testID="notif-toggle-confirm"
          open={pendingToggle !== null}
          title={pendingToggle ? 'Enable notifications?' : 'Disable notifications?'}
          message={
            pendingToggle
              ? 'Get pod, club, chat and account updates on this device.'
              : "You won't receive notifications until you turn them back on."
          }
          confirmLabel={pendingToggle ? 'Enable' : 'Disable'}
          destructive={!pendingToggle}
          onConfirm={() => {
            setNotifEnabled(pendingToggle === true);
            setPendingToggle(null);
          }}
          onCancel={() => setPendingToggle(null)}
        />
      </ModalThemeScope>
    </Modal>
  );
}
