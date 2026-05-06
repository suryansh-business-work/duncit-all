import {
  Box,
  Button,
  Chip,
  Divider,
  Popover,
  Stack,
  Typography,
} from '@mui/material';
import CircleIcon from '@mui/icons-material/Circle';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { isPushSupported } from '../../pwa';
import { formatRelative } from './queries';

interface Props {
  anchor: HTMLElement | null;
  onClose: () => void;
  notifs: any[];
  unreadCount: number;
  perm: NotificationPermission | 'unsupported';
  pushBusy: boolean;
  onEnablePush: () => void;
  onNotifClick: (n: any) => void;
  onMarkAll: () => void;
}

export default function NotificationsPopover({
  anchor,
  onClose,
  notifs,
  unreadCount,
  perm,
  pushBusy,
  onEnablePush,
  onNotifClick,
  onMarkAll,
}: Props) {
  return (
    <Popover
      open={!!anchor}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      PaperProps={{ sx: { width: 340 } }}
    >
      <Box
        sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography variant="subtitle2">Notifications</Typography>
        {unreadCount > 0 && <Chip size="small" color="primary" label={`${unreadCount} new`} />}
      </Box>
      {isPushSupported() && perm !== 'granted' && perm !== 'unsupported' && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            startIcon={<NotificationsActiveIcon />}
            onClick={onEnablePush}
            disabled={pushBusy}
          >
            {pushBusy ? 'Enabling…' : 'Enable push notifications'}
          </Button>
        </Box>
      )}
      <Divider />
      {notifs.length === 0 && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            No notifications yet
          </Typography>
        </Box>
      )}
      {notifs.map((n: any) => {
        const unread = !n.read_at;
        const notif = n.notification;
        return (
          <Box
            key={n.id}
            onClick={() => onNotifClick(n)}
            sx={{
              p: 1.5,
              display: 'flex',
              gap: 1.5,
              alignItems: 'flex-start',
              bgcolor: unread ? 'action.hover' : 'transparent',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.selected' },
            }}
          >
            <CircleIcon
              sx={{ fontSize: 8, mt: 1, color: unread ? 'primary.main' : 'transparent' }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {notif?.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatRelative(n.created_at)}
                </Typography>
              </Stack>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {notif?.body}
              </Typography>
            </Box>
          </Box>
        );
      })}
      <Divider />
      <Box sx={{ p: 1, textAlign: 'center' }}>
        <Button size="small" onClick={onMarkAll} disabled={unreadCount === 0}>
          Mark all as read
        </Button>
      </Box>
    </Popover>
  );
}
