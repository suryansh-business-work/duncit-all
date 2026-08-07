import { Box, Stack, Tooltip, Typography } from '@mui/material';
import MessageActions from '../MessageActions';
import MessageStatus from '../MessageStatus';
import type { StaffMessage } from '../queries';

interface Props {
  message: StaffMessage;
  mine: boolean;
  editing: boolean;
  deleted: boolean;
  formats: { time: Intl.DateTimeFormat; full: Intl.DateTimeFormat };
  onReply: () => void;
  onForward: () => void;
  onPin: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: (forEveryone: boolean) => void;
  onRetry?: () => void;
}

/**
 * The line under a message: when it was sent, whether it got there, and what
 * can be done to it.
 *
 * The short time is always shown and the full one is on hover — a thread of
 * "14:32" is scannable, and the date only matters when somebody asks.
 */
export default function BubbleFooter({
  message,
  mine,
  editing,
  deleted,
  formats,
  onReply,
  onForward,
  onPin,
  onCopy,
  onEdit,
  onDelete,
  onRetry,
}: Readonly<Props>) {
  const at = message.created_at ? new Date(message.created_at) : null;
  const showTools = !deleted && !editing;

  return (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.25 }}>
      <Tooltip title={at ? formats.full.format(at) : ''}>
        <Typography variant="caption" sx={{ opacity: 0.7, flex: 1, cursor: 'default' }}>
          {at ? formats.time.format(at) : ''}
          {message.edited_at && !deleted ? ' · edited' : ''}
        </Typography>
      </Tooltip>

      {mine && showTools && (
        <Box
          component="span"
          onClick={message.failed ? onRetry : undefined}
          sx={{ display: 'inline-flex', cursor: message.failed ? 'pointer' : 'default' }}
        >
          <MessageStatus message={message} />
        </Box>
      )}

      {showTools && (
        <Box className="staff-bubble-tools" sx={{ display: 'inline-flex' }}>
          <MessageActions
            message={message}
            mine={mine}
            onReply={onReply}
            onForward={onForward}
            onPin={onPin}
            onCopy={onCopy}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </Box>
      )}
    </Stack>
  );
}
