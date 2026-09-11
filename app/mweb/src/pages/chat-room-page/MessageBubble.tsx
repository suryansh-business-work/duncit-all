import { Avatar, Box, Paper, Stack, Typography } from '@mui/material';
import { formatTime } from '../../utils/dateFormat';
import { bubbleRadiusSx } from '../support-chat/calmStyles';

interface MessageBubbleProps {
  message: any;
  mine: boolean;
  onOpenReact: (el: HTMLElement, id: string) => void;
}

export default function MessageBubble({ message, mine, onOpenReact }: Readonly<MessageBubbleProps>) {
  const m = message;
  const messageContent =
    m.type === 'IMAGE' ? (
      <Box
        component="img"
        src={m.image_url}
        alt=""
        sx={{ maxWidth: 240, maxHeight: 240, borderRadius: '12px', display: 'block' }}
      />
    ) : (
      <Typography
        variant="body2"
        sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
      >
        {m.text}
      </Typography>
    );
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ mb: 1, justifyContent: mine ? 'flex-end' : 'flex-start', alignItems: 'flex-end' }}
    >
      {!mine && (
        <Avatar src={m.user_photo || undefined} sx={{ width: 32, height: 32 }}>
          {(m.user_name || '?').charAt(0)}
        </Avatar>
      )}
      <Paper
        onDoubleClick={(e) => onOpenReact(e.currentTarget, m.id)}
        sx={{
          p: 1.15,
          px: 1.5,
          maxWidth: '78%',
          bgcolor: mine ? 'primary.main' : 'background.paper',
          color: mine ? 'primary.contrastText' : 'text.primary',
          ...bubbleRadiusSx(mine),
          cursor: 'pointer',
          border: mine ? 0 : '1px solid var(--duncit-card-border)',
          boxShadow: 'none',
        }}
      >
        {!mine && (
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, color: 'text.secondary', display: 'block' }}
          >
            {m.user_name || 'User'}
          </Typography>
        )}
        {m.deleted ? (
          <Typography variant="body2" sx={{ fontStyle: 'italic', opacity: 0.7 }}>
            deleted
          </Typography>
        ) : (
          messageContent
        )}
        <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5, textAlign: 'right' }}>
          {formatTime(m.createdAt)}
        </Typography>
        {m.reactions?.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
            {Object.entries(
              m.reactions.reduce((acc: any, r: any) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {})
            ).map(([emoji, count]) => (
              <Box
                key={emoji}
                sx={{
                  fontSize: 12,
                  bgcolor: 'rgba(0,0,0,0.1)',
                  color: mine ? 'primary.contrastText' : 'text.primary',
                  // A reaction count is a pill like a Chip, so it keeps its
                  // round ends under the 4px corner cap.
                  borderRadius: 999,
                  px: 0.75,
                }}
              >
                {emoji} {String(count)}
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
