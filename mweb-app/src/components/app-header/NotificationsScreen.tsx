import { Avatar, Box, Button, Chip, Dialog, IconButton, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CircleIcon from '@mui/icons-material/Circle';
import CloseIcon from '@mui/icons-material/Close';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { isPushSupported } from '../../pwa';
import { formatRelative } from './queries';

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
}: NotificationsScreenProps) {
  const canEnablePush = isPushSupported() && perm !== 'granted' && perm !== 'unsupported';

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
      <Stack sx={{ minHeight: '100dvh', color: 'text.primary' }}>
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: 1.5, py: 1.25 }}>
          <IconButton onClick={onClose} aria-label="Close notifications" sx={{ bgcolor: 'action.hover' }}>
            <CloseIcon />
          </IconButton>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 950, lineHeight: 1 }}>
              Notifications
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
              {unreadCount > 0 ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'All caught up'}
            </Typography>
          </Box>
          <IconButton onClick={onMarkAll} disabled={unreadCount === 0} aria-label="Mark all as read" sx={{ bgcolor: 'action.hover' }}>
            <DoneAllIcon />
          </IconButton>
        </Stack>

        <Box sx={{ px: 1.5, pb: 1.5 }}>
          <Box sx={{ p: 1.5, borderRadius: 4, bgcolor: 'rgba(255,79,115,0.12)', border: '1px solid rgba(255,79,115,0.22)' }}>
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <Stack direction="row" spacing={-1} sx={{ flex: '0 0 auto' }}>
                {[0, 1, 2].map((index) => (
                  <Avatar key={index} sx={{ width: 34, height: 34, bgcolor: index === 0 ? 'primary.main' : index === 1 ? 'secondary.main' : 'info.main', border: 2, borderColor: 'background.paper' }}>
                    <NotificationsActiveIcon fontSize="small" />
                  </Avatar>
                ))}
              </Stack>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 950 }} noWrap>
                  Duncit updates are live
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Pods, clubs, chats and account updates in one place.
                </Typography>
              </Box>
              <Chip color="primary" label={`${notifs.length}`} sx={{ fontWeight: 900 }} />
            </Stack>
            {canEnablePush && (
              <Button fullWidth variant="contained" startIcon={<NotificationsActiveIcon />} onClick={onEnablePush} disabled={pushBusy} sx={{ mt: 1.25, borderRadius: 999, fontWeight: 900 }}>
                {pushBusy ? 'Enabling...' : 'Enable push notifications'}
              </Button>
            )}
          </Box>
        </Box>

        <Stack spacing={1} sx={{ px: 1.5, pb: 3, overflowY: 'auto' }}>
          {notifs.length === 0 && (
            <Box sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No notifications yet.
              </Typography>
            </Box>
          )}
          {notifs.map((item: any) => {
            const unread = !item.read_at;
            const notification = item.notification;
            return (
              <Box
                key={item.id}
                onClick={() => onNotifClick(item)}
                sx={{
                  p: 1.35,
                  borderRadius: 4,
                  bgcolor: unread ? 'rgba(255,79,115,0.14)' : 'background.paper',
                  border: 1,
                  borderColor: unread ? 'primary.main' : 'divider',
                  cursor: 'pointer',
                  boxShadow: unread ? '0 16px 34px rgba(255,79,115,0.16)' : 'none',
                }}
              >
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Avatar src={notification?.image_url || undefined} sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>
                    <NotificationsActiveIcon />
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      {unread && <CircleIcon sx={{ fontSize: 8, color: 'primary.main' }} />}
                      <Typography variant="subtitle2" sx={{ fontWeight: 950 }} noWrap>
                        {notification?.title ?? 'Notification'}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {notification?.body}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                      {formatRelative(item.created_at)} ago
                    </Typography>
                  </Box>
                  {notification?.link_url && <ArrowForwardIcon color="primary" />}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </Stack>
    </Dialog>
  );
}