import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { Badge, IconButton, Tooltip } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { MARK_ALL, MARK_READ, MY_NOTIFS } from './queries';
import NotificationsConfirmSheet from './NotificationsConfirmSheet';
import NotificationsPopover from './NotificationsPopover';
import { useHeaderPushNotifications } from './useHeaderPushNotifications';
import { useNotificationsSse } from './useNotificationsSse';

interface HeaderNotificationsBellProps {
  onToast: (toast: { title?: string; body?: string } | null) => void;
}

export default function HeaderNotificationsBell({ onToast }: HeaderNotificationsBellProps) {
  const navigate = useNavigate();
  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);
  const [notifConfirm, setNotifConfirm] = useState<HTMLElement | null>(null);

  const { data: notifData, refetch: refetchNotifs } = useQuery(MY_NOTIFS, {
    fetchPolicy: 'cache-and-network',
  });
  useNotificationsSse(() => {
    void refetchNotifs();
  });
  const [markReadMut] = useMutation(MARK_READ);
  const [markAllMut] = useMutation(MARK_ALL);
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

  const onNotifClick = async (n: any) => {
    if (!n.read_at) {
      try {
        await markReadMut({ variables: { id: n.id } });
        await refetchNotifs();
      } catch {
        /* ignore */
      }
    }
    const link = n.notification?.link_url;
    setNotifAnchor(null);
    if (link) navigate(link);
  };

  const onMarkAll = async () => {
    try {
      await markAllMut();
      await refetchNotifs();
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          size="small"
          onClick={(e) => setNotifConfirm(e.currentTarget)}
          aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
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
        </IconButton>
      </Tooltip>
      <NotificationsConfirmSheet
        anchor={notifConfirm}
        unreadCount={unreadCount}
        onClose={() => setNotifConfirm(null)}
        onContinue={(a) => {
          setNotifConfirm(null);
          setNotifAnchor(a);
        }}
      />
      <NotificationsPopover
        anchor={notifAnchor}
        onClose={() => setNotifAnchor(null)}
        notifs={myNotifs}
        unreadCount={unreadCount}
        perm={perm}
        pushBusy={pushBusy}
        onEnablePush={enablePush}
        onNotifClick={onNotifClick}
        onMarkAll={onMarkAll}
      />
    </>
  );
}
