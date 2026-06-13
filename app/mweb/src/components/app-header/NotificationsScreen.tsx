import { Avatar, Box, Chip, Dialog, IconButton, Stack, Switch, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloseIcon from '@mui/icons-material/Close';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { isPushSupported, unsubscribePush } from '../../pwa';
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
}: Readonly<NotificationsScreenProps>) {
  const pushSupported = isPushSupported() && perm !== 'unsupported';
  const pushOn = perm === 'granted';
  // Derive unread from the actual items so the header never disagrees with the
  // list / badge (the server count can lag behind the rendered notifications).
  const liveUnread = notifs.filter((n) => !n.read_at).length || unreadCount;

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
              {liveUnread > 0 ? `${liveUnread} unread update${liveUnread === 1 ? '' : 's'}` : 'All caught up'}
            </Typography>
          </Box>
          <IconButton onClick={onMarkAll} disabled={liveUnread === 0} aria-label="Mark all as read" sx={{ bgcolor: 'action.hover' }}>
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
            {pushSupported && (
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1.25 }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  Allow notifications
                </Typography>
                <Switch
                  checked={pushOn}
                  disabled={pushBusy}
                  onChange={(_e, next) => {
                    if (next) onEnablePush();
                    else unsubscribePush().catch(() => undefined);
                  }}
                  inputProps={{ 'aria-label': 'Allow notifications' }}
                />
              </Stack>
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
            // Unread cards get the primary gradient highlight — chat-style rows
            // (avatar · title + preview · time · NEW badge), like the mobile app.
            return (
              <Box
                key={item.id}
                onClick={() => onNotifClick(item)}
                sx={{
                  p: 1.35,
                  borderRadius: 4,
                  cursor: 'pointer',
                  color: unread ? 'primary.contrastText' : 'text.primary',
                  background: unread ? 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)' : undefined,
                  bgcolor: unread ? undefined : 'background.paper',
                  border: 1,
                  borderColor: unread ? 'transparent' : 'divider',
                  boxShadow: unread ? '0 16px 34px rgba(255,79,115,0.28)' : 'none',
                  transition: 'transform 160ms ease, box-shadow 160ms ease',
                  '&:hover': { transform: 'translateY(-1px)' },
                }}
              >
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Avatar
                    src={notification?.image_url || undefined}
                    sx={{ width: 48, height: 48, bgcolor: unread ? 'rgba(255,255,255,0.24)' : 'primary.main' }}
                  >
                    <NotificationsActiveIcon />
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 950,
                          flex: 1,
                          minWidth: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {notification?.title ?? 'Notification'}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800, opacity: unread ? 0.9 : 0.7 }}>
                        {formatRelative(item.created_at)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography
                        variant="body2"
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          opacity: unread ? 0.92 : 0.75,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {notification?.body}
                      </Typography>
                      {unread && (
                        <Chip
                          label="NEW"
                          size="small"
                          sx={{ height: 20, fontSize: 10.5, fontWeight: 900, color: '#fff', bgcolor: 'rgba(255,255,255,0.26)' }}
                        />
                      )}
                    </Stack>
                  </Box>
                  {notification?.link_url && <ArrowForwardIcon sx={{ color: unread ? '#fff' : 'primary.main' }} />}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </Stack>
    </Dialog>
  );
}