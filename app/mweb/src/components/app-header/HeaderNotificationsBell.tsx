import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Badge, Tooltip } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { DuncitIconButton } from '@duncit/buttons';
import { MARK_ALL, MARK_READ, MY_NOTIFS } from './queries';
import NotificationsScreen from './notifications-screen';
import { useHeaderPushNotifications } from './useHeaderPushNotifications';
import { useNotificationsSse } from './useNotificationsSse';
import { useNavigate } from 'react-router';
import { useTranslation } from '../../i18n/useTranslation';

interface HeaderNotificationsBellProps {
  onToast: (toast: { title?: string; body?: string } | null) => void;
}

export default function HeaderNotificationsBell({ onToast }: Readonly<HeaderNotificationsBellProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const { data: notifData, refetch: refetchNotifs } = useQuery<any>(MY_NOTIFS, {
    fetchPolicy: 'cache-and-network',
  });
  useNotificationsSse(() => {
    refetchNotifs().catch(() => {
      /* ignore */
    });
  });
  const [markReadMut] = useMutation<any>(MARK_READ);
  const [markAllMut] = useMutation<any>(MARK_ALL);
  const myNotifs: any[] = notifData?.myNotifications ?? [];
  const unreadCount: number = notifData?.myUnreadNotificationCount ?? 0;

  const { perm, pushBusy, toast, setToast, enablePush } = useHeaderPushNotifications(
    () => refetchNotifs() as Promise<unknown>
  );

  // Bubble push toasts up so the parent can render a single Snackbar.
  useEffect(() => {
    if (toast) {
      onToast(toast);
      setToast(null);
    }
  }, [toast, onToast, setToast]);

  // Which row is mid-mark-read, and whether mark-all is running. Both round-trip
  // (mutation + refetch), and without this the tap looked like it did nothing.
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markAllBusy, setMarkAllBusy] = useState(false);

  const onNotifClick = async (n: any) => {
    if (!n.read_at) {
      setBusyId(n.id);
      try {
        await markReadMut({ variables: { id: n.id } });
        await refetchNotifs();
      } catch {
        /* ignore */
      } finally {
        setBusyId(null);
      }
    }
    const link = n.notification?.link_url;
    setNotificationsOpen(false);
    if (link) navigate(link);
  };

  const onMarkAll = async () => {
    setMarkAllBusy(true);
    try {
      await markAllMut();
      await refetchNotifs();
    } catch {
      /* ignore */
    } finally {
      setMarkAllBusy(false);
    }
  };

  const unreadLabel = unreadCount ? ` (${unreadCount} unread)` : '';

  return (
    <>
      <Tooltip title={t('mweb.appHeader.notifications')}>
        <DuncitIconButton
          size="small"
          onClick={() => setNotificationsOpen(true)}
          aria-label={`Notifications${unreadLabel}`}
          sx={{
            minWidth: 40,
            minHeight: 40,
            bgcolor: 'action.hover',
            border: 1,
            borderColor: 'divider',
            '&:hover': { bgcolor: 'action.selected' },
          }}
        >
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon fontSize="small" />
          </Badge>
        </DuncitIconButton>
      </Tooltip>
      <NotificationsScreen
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifs={myNotifs}
        unreadCount={unreadCount}
        perm={perm}
        pushBusy={pushBusy}
        onEnablePush={enablePush}
        onNotifClick={onNotifClick}
        onMarkAll={onMarkAll}
        busyId={busyId}
        markAllBusy={markAllBusy}
        onRefresh={() => {
          refetchNotifs().catch(() => undefined);
        }}
      />
    </>
  );
}
