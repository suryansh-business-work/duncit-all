import { useMemo, useState } from 'react';
import { Box, CircularProgress, Dialog, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import {
  matchesNotificationFilter,
  notificationChips,
  type NotificationFilterKey,
} from '@duncit/utils';
import ConfirmDialog from '../../ConfirmDialog';
import { isPushSupported, unsubscribePush } from '../../../pwa';
import NotificationFilterChips from './NotificationFilterChips';
import NotificationRow from './NotificationRow';
import NotificationsHero from './NotificationsHero';
import { useTranslation } from '../../../i18n/useTranslation';

interface NotificationsScreenProps {
  open: boolean;
  onClose: () => void;
  notifs: any[];
  unreadCount: number;
  perm: NotificationPermission | 'unsupported';
  pushBusy: boolean;
  onEnablePush: () => void;
  onNotifClick: (n: any) => void;
  onMarkAll: () => void;
  /** Id of the row whose mark-read is in flight. */
  busyId?: string | null;
  /** True while mark-all-read is in flight. */
  markAllBusy?: boolean;
  /** Re-read the inbox after an inline action (accept/reject a follow request). */
  onRefresh?: () => void;
}

export default function NotificationsScreen({
  open,
  onClose,
  notifs,
  unreadCount,
  perm,
  pushBusy,
  onEnablePush,
  onNotifClick,
  onMarkAll,
  busyId = null,
  markAllBusy = false,
  onRefresh,
}: Readonly<NotificationsScreenProps>) {
  const { t } = useTranslation();
  const pushSupported = isPushSupported() && perm !== 'unsupported';
  // Pending allow/deny choice — confirmed before we touch the push subscription.
  const [pendingToggle, setPendingToggle] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<NotificationFilterKey>('all');

  const applyToggle = () => {
    if (pendingToggle) onEnablePush();
    else unsubscribePush().catch(() => undefined);
    setPendingToggle(null);
  };

  const chips = useMemo(
    () => notificationChips(notifs.map((item) => item.notification?.title)),
    [notifs]
  );
  // A chip can disappear when its last notification is read away; falling back
  // to "All" beats rendering an empty list under a chip that no longer exists.
  const activeFilter = chips.some((chip) => chip.key === filter) ? filter : 'all';
  const visible = notifs.filter((item) =>
    matchesNotificationFilter(item.notification?.title, activeFilter)
  );

  // Derive unread from the actual items so the header never disagrees with the
  // list / badge (the server count can lag behind the rendered notifications).
  const liveUnread = notifs.filter((n) => !n.read_at).length || unreadCount;
  const unreadLabel = `${liveUnread} unread update${liveUnread === 1 ? '' : 's'}`;
  const headerSubtitle = liveUnread > 0 ? unreadLabel : 'All caught up';

  return (
    <Dialog
      open={open}
      fullScreen
      onClose={onClose}
      PaperProps={{
        sx: {
          backgroundImage: 'var(--duncit-app-bg)',
          backgroundSize: '180% 180%',
          animation: 'duncit-bg-drift 36s ease-in-out infinite alternate',
        },
      }}
    >
      {/* A definite height (not min-height) makes this the scroll frame: the
          header, hero and chips stay their natural size and the list alone
          scrolls. With min-height the rows pushed the container past the
          viewport and every sibling was compressed to fit. */}
      <Stack sx={{ height: '100dvh', color: 'text.primary' }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{ px: 1.5, py: 1.25, flexShrink: 0 }}
        >
          <IconButton
            onClick={onClose}
            aria-label={t('mweb.common.closeNotifications')}
            sx={{ bgcolor: 'action.hover' }}
          >
            <CloseIcon />
          </IconButton>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1 }}>
              Notifications
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {headerSubtitle}
            </Typography>
          </Box>
          <IconButton
            onClick={onMarkAll}
            disabled={liveUnread === 0 || markAllBusy}
            aria-label={t('mweb.common.markAllAsRead')}
            aria-busy={markAllBusy}
            sx={{ bgcolor: 'action.hover' }}
          >
            {markAllBusy ? <CircularProgress size={20} color="inherit" /> : <DoneAllIcon />}
          </IconButton>
        </Stack>

        <NotificationsHero
          total={notifs.length}
          pushSupported={pushSupported}
          pushOn={perm === 'granted'}
          pushBusy={pushBusy}
          onToggle={setPendingToggle}
        />

        <NotificationFilterChips chips={chips} value={activeFilter} onChange={setFilter} />

        {/* minHeight: 0 lets a flex child actually scroll — without it the
            item's automatic minimum size keeps it as tall as its content. */}
        <Stack spacing={1} sx={{ px: 1.5, pb: 3, flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {visible.length === 0 && (
            <Box sx={{ p: 3, borderRadius: '16px', bgcolor: 'background.paper', textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {notifs.length === 0 ? 'No notifications yet.' : 'Nothing in this category.'}
              </Typography>
            </Box>
          )}
          {visible.map((item: any) => (
            <NotificationRow
              key={item.id}
              item={item}
              busy={busyId === item.id || markAllBusy}
              onClick={() => onNotifClick(item)}
              onAnswered={onRefresh}
            />
          ))}
        </Stack>
      </Stack>
      <ConfirmDialog
        open={pendingToggle !== null}
        title={pendingToggle ? 'Enable notifications?' : 'Disable notifications?'}
        message={
          pendingToggle
            ? 'Get pod, club, chat and account updates on this device.'
            : "You won't receive push notifications until you turn them back on."
        }
        confirmLabel={pendingToggle ? 'Enable' : 'Disable'}
        destructive={!pendingToggle}
        busy={pushBusy}
        onConfirm={applyToggle}
        onClose={() => setPendingToggle(null)}
      />
    </Dialog>
  );
}
