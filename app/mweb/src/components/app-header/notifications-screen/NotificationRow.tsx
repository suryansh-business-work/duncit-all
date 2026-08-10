import { Avatar, Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { formatRelative } from '../queries';
import { notificationIcon } from '../notificationIcon';
import FollowRequestActions from './FollowRequestActions';

interface Props {
  item: any;
  /** True while this row's mark-read is in flight — the row is the only thing
   * that should look busy, not the whole list. */
  busy: boolean;
  onClick: () => void;
  /** Re-read the inbox once an inline action changes something. */
  onAnswered?: () => void;
}

const CLAMP_2 = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
} as const;

/** One notification card — chat-style row (avatar · title + preview · time),
 * unread highlighted by the primary gradient. */
export default function NotificationRow({
  item,
  busy,
  onClick,
  onAnswered,
}: Readonly<Props>) {
  const unread = !item.read_at;
  const notification = item.notification;
  // An actionable row ends in its buttons, so the "open me" chevron would be a
  // second, competing affordance.
  const showChevron =
    !busy && !!notification?.link_url && notification?.action_type !== 'FOLLOW_REQUEST';
  // Contextual icon by notification type (falls back to the bell) instead of
  // repeating a generic bell on every row.
  const RowIcon = notificationIcon(notification?.title);

  return (
    <Box
      onClick={busy ? undefined : onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (!busy && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onClick();
        }
      }}
      aria-busy={busy}
      sx={{
        p: 1.35,
        borderRadius: '16px',
        cursor: busy ? 'progress' : 'pointer',
        color: unread ? 'primary.contrastText' : 'text.primary',
        background: unread ? 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)' : undefined,
        bgcolor: unread ? undefined : 'background.paper',
        border: 1,
        borderColor: unread ? 'transparent' : 'divider',
        boxShadow: unread ? '0 16px 34px rgba(255,79,115,0.28)' : 'none',
        opacity: busy ? 0.6 : 1,
        // The gradient → surface swap on read is the transition worth animating:
        // without it the card snaps from pink to white mid-tap.
        transition:
          'transform 160ms ease, box-shadow 220ms ease, opacity 160ms ease, background-color 260ms ease, color 260ms ease',
        '&:hover': { transform: busy ? 'none' : 'translateY(-1px)' },
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Avatar
          src={notification?.image_url || undefined}
          sx={{ width: 48, height: 48, bgcolor: unread ? 'rgba(255,255,255,0.24)' : 'primary.main' }}
        >
          <RowIcon />
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1, minWidth: 0, ...CLAMP_2 }}>
              {notification?.title ?? 'Notification'}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, opacity: unread ? 0.9 : 0.7 }}>
              {formatRelative(item.created_at)}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography
              variant="body2"
              sx={{ flex: 1, minWidth: 0, opacity: unread ? 0.92 : 0.75, ...CLAMP_2 }}
            >
              {notification?.body}
            </Typography>
            {unread && (
              <Chip
                label="NEW"
                size="small"
                sx={{
                  height: 20,
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: '#fff',
                  bgcolor: 'rgba(255,255,255,0.26)',
                }}
              />
            )}
          </Stack>
        </Box>
        {busy && <CircularProgress size={18} color="inherit" />}
        {showChevron && <ArrowForwardIcon sx={{ color: unread ? '#fff' : 'primary.main' }} />}
      </Stack>
      <FollowRequestActions
        actionType={notification?.action_type}
        requestId={notification?.action_ref_id}
        status={notification?.action_status}
        unreadRow={unread}
        onAnswered={() => onAnswered?.()}
      />
    </Box>
  );
}
