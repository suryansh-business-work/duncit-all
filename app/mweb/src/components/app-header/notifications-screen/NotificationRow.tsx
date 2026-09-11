import { Avatar, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { followRequestRowState } from '@duncit/utils';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
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

/** One notification row — icon disc · title + preview · time, with an accent
 * dot while unread. The list groups the rows inside one card. Native twin:
 * components/notifications/NotificationRow. */
export default function NotificationRow({
  item,
  busy,
  onClick,
  onAnswered,
}: Readonly<Props>) {
  const unread = !item.read_at;
  const notification = item.notification;
  // The same decision the buttons below make, so the two cannot disagree: an
  // actionable row ends in its buttons, and the "open me" chevron would be a
  // second, competing affordance. A new-follower row the viewer already follows
  // back renders no buttons, so it keeps its chevron.
  const rowState = followRequestRowState({
    actionType: notification?.action_type,
    requestId: notification?.action_ref_id,
    status: notification?.action_status,
    followBackStatus: notification?.follow_back_status,
    actorId: notification?.action_actor_id,
  });
  const showChevron = !busy && !!notification?.link_url && rowState === 'HIDDEN';
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
        px: 2,
        py: 1.75,
        cursor: busy ? 'progress' : 'pointer',
        color: 'text.primary',
        opacity: busy ? 0.6 : 1,
        transition: 'background-color 160ms ease, opacity 160ms ease',
        '&:hover': { bgcolor: busy ? undefined : 'action.hover' },
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{
        alignItems: "flex-start"
      }}>
        <Avatar
          src={notification?.image_url || undefined}
          sx={{ width: 40, height: 40, bgcolor: 'action.hover', color: 'secondary.main' }}
        >
          <RowIcon fontSize="small" />
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={0.75} sx={{
            alignItems: "center"
          }}>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, flex: 1, minWidth: 0, ...CLAMP_2 }}>
              {notification?.title ?? 'Notification'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0 }}>
              {formatRelative(item.created_at)}
            </Typography>
            {unread && (
              <Box
                aria-hidden
                sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'secondary.main', flexShrink: 0 }}
              />
            )}
          </Stack>
          <Stack direction="row" spacing={1} sx={{
            alignItems: "center"
          }}>
            <Typography
              variant="body2"
              sx={{ flex: 1, minWidth: 0, color: 'text.secondary', fontSize: '0.8125rem', ...CLAMP_2 }}
            >
              {notification?.body}
            </Typography>
            {busy && <CircularProgress size={18} color="inherit" />}
            {showChevron && <ChevronRightRoundedIcon sx={{ color: 'text.secondary' }} />}
          </Stack>
          <FollowRequestActions
            actionType={notification?.action_type}
            requestId={notification?.action_ref_id}
            status={notification?.action_status}
            actorId={notification?.action_actor_id}
            followBackStatus={notification?.follow_back_status}
            unreadRow={unread}
            onAnswered={() => onAnswered?.()}
          />
        </Box>
      </Stack>
    </Box>
  );
}
