import { useState } from 'react';
import { Badge, IconButton, Tooltip } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsScreen from './NotificationsScreen';

interface Props {
  notifs: any[];
  unreadCount: number;
  perm: NotificationPermission | 'unsupported';
  pushBusy: boolean;
  onEnablePush: () => Promise<void> | void;
  onNotifClick: (n: any) => void;
  onMarkAll: () => void;
}

export default function NotificationsBell({
  notifs,
  unreadCount,
  perm,
  pushBusy,
  onEnablePush,
  onNotifClick,
  onMarkAll,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const unreadSuffix = unreadCount ? ` (${unreadCount} unread)` : '';

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          size="small"
          onClick={() => setOpen(true)}
          aria-label={`Notifications${unreadSuffix}`}
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>
      <NotificationsScreen
        open={open}
        onClose={() => setOpen(false)}
        notifs={notifs}
        unreadCount={unreadCount}
        perm={perm}
        pushBusy={pushBusy}
        onEnablePush={onEnablePush}
        onNotifClick={(notification) => {
          setOpen(false);
          onNotifClick(notification);
        }}
        onMarkAll={onMarkAll}
      />
    </>
  );
}
