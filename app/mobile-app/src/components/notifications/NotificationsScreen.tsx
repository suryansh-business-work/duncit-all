import { useMemo, useState } from 'react';
import { FlatList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import {
  matchesNotificationFilter,
  notificationChips,
  type NotificationFilterKey,
} from '@duncit/utils';

import { AppBackground } from '@/components/AppBackground';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useNotificationPrefsStore } from '@/stores/notification-prefs.store';
import type { UserNotification } from '@/hooks/useNotifications';
import { NotificationFilterChips } from './NotificationFilterChips';
import { NotificationRow } from './NotificationRow';
import { NotificationsHero } from './NotificationsHero';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

export interface NotificationsScreenProps {
  open: boolean;
  onClose: () => void;
  notifs: UserNotification[];
  unreadCount: number;
  onNotifClick: (item: UserNotification) => void;
  onMarkAll: () => void;
  /** Id of the row whose mark-read is in flight. */
  busyId?: string | null;
  /** True while mark-all-read is in flight. */
  markAllBusy?: boolean;
  /** Re-read the inbox after an inline action (accept/reject a follow request). */
  onRefresh?: () => void;
}

/** Full-screen notifications list — RN twin of mWeb's <NotificationsScreen/>.
 * Header with unread count + mark-all, a live banner, category chips, the list. */
export function NotificationsScreen({
  open,
  onClose,
  notifs,
  unreadCount,
  onNotifClick,
  onMarkAll,
  busyId = null,
  markAllBusy = false,
  onRefresh,
}: Readonly<NotificationsScreenProps>) {
  const { t } = useTranslation();
  const { color, primary } = useThemeColors();
  const notifEnabled = useNotificationPrefsStore((s) => s.enabled);
  const setNotifEnabled = useNotificationPrefsStore((s) => s.setEnabled);
  // Confirm before flipping the master notification switch (B2-#8).
  const [pendingToggle, setPendingToggle] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<NotificationFilterKey>('all');

  const chips = useMemo(
    () => notificationChips(notifs.map((item) => item.notification.title)),
    [notifs],
  );
  // A chip can disappear when its last notification is read away; falling back
  // to "All" beats rendering an empty list under a chip that no longer exists.
  const activeFilter = chips.some((chip) => chip.key === filter) ? filter : 'all';
  const visible = notifs.filter((item) =>
    matchesNotificationFilter(item.notification.title, activeFilter),
  );

  // Derive unread from the loaded items so the header can't say "All caught up"
  // while unread rows are visible; fall back to the count when items lag (BUG-5).
  const liveUnread = notifs.filter((item) => !item.read_at).length || unreadCount;
  const plural = liveUnread === 1 ? '' : 's';
  const markAllDisabled = liveUnread === 0 || markAllBusy;
  const emptyText = notifs.length === 0 ? 'No notifications yet.' : 'Nothing in this category.';

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
                aria-label={t('mweb.common.closeNotifications')}
                onPress={onClose}
                width={40}
                height={40}
                alignItems="center"
                justifyContent="center"
                borderRadius={20}
                backgroundColor="$surface"
                pressStyle={PRESS_STYLE.row}
              >
                <MaterialIcons name="close" size={20} color={color} />
              </XStack>
              <YStack flex={1}>
                <Text fontSize={22} fontWeight="700" color="$color">
                  Notifications
                </Text>
                <Text fontSize={12} fontWeight="600" color="$muted">
                  {liveUnread > 0 ? `${liveUnread} unread update${plural}` : 'All caught up'}
                </Text>
              </YStack>
              <XStack
                testID="notifications-mark-all"
                role="button"
                aria-label={t('mweb.common.markAllAsRead')}
                aria-disabled={markAllDisabled}
                aria-busy={markAllBusy}
                onPress={markAllDisabled ? undefined : onMarkAll}
                width={40}
                height={40}
                alignItems="center"
                justifyContent="center"
                borderRadius={20}
                backgroundColor="$surface"
                opacity={markAllDisabled ? 0.5 : 1}
                pressStyle={PRESS_STYLE.row}
              >
                {markAllBusy ? (
                  <Spinner testID="notifications-mark-all-busy" size="small" color={primary} />
                ) : (
                  <MaterialIcons name="done-all" size={20} color={color} />
                )}
              </XStack>
            </XStack>

            <NotificationsHero
              total={notifs.length}
              enabled={notifEnabled}
              onToggle={setPendingToggle}
            />

            <NotificationFilterChips chips={chips} value={activeFilter} onChange={setFilter} />

            <FlatList
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24, gap: 8 }}
              data={visible}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <NotificationRow
                  item={item}
                  busy={busyId === item.id || markAllBusy}
                  onPress={() => onNotifClick(item)}
                  onAnswered={onRefresh}
                />
              )}
              ListEmptyComponent={
                <YStack
                  padding={24}
                  borderRadius={16}
                  backgroundColor="$surface"
                  alignItems="center"
                >
                  <Text fontSize={14} color="$muted">
                    {emptyText}
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
