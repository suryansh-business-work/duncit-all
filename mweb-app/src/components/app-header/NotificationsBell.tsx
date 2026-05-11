import { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  IconButton,
  Stack,
  SwipeableDrawer,
  Tooltip,
  Typography,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsPopover from './NotificationsPopover';

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
}: Props) {
  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);
  const [notifConfirm, setNotifConfirm] = useState<HTMLElement | null>(null);

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          size="small"
          onClick={(e) => setNotifConfirm(e.currentTarget)}
          aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>
      <SwipeableDrawer
        anchor="bottom"
        open={!!notifConfirm}
        onOpen={() => undefined}
        onClose={() => setNotifConfirm(null)}
        PaperProps={{
          sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, p: 2 },
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 4,
            bgcolor: 'divider',
            borderRadius: 2,
            mx: 'auto',
            mb: 2,
          }}
        />
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <NotificationsActiveIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={700}>
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                : 'View notifications'}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Open your inbox to see club updates, new pods and silent moments.
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 1 }}>
            <Button onClick={() => setNotifConfirm(null)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() => {
                const anchor = notifConfirm;
                setNotifConfirm(null);
                setNotifAnchor(anchor);
              }}
            >
              View notifications
            </Button>
          </Stack>
        </Stack>
      </SwipeableDrawer>
      <NotificationsPopover
        anchor={notifAnchor}
        onClose={() => setNotifAnchor(null)}
        notifs={notifs}
        unreadCount={unreadCount}
        perm={perm}
        pushBusy={pushBusy}
        onEnablePush={onEnablePush}
        onNotifClick={onNotifClick}
        onMarkAll={onMarkAll}
      />
    </>
  );
}
