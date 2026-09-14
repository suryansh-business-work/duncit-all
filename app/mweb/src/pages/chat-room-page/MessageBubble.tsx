import { Avatar, Box, Paper, Stack, Typography } from '@mui/material';
import { formatTime } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';
import { bubbleRadiusSx } from '../support-chat/calmStyles';

interface MessageBubbleProps {
  message: any;
  mine: boolean;
  onOpenReact: (el: HTMLElement, id: string) => void;
}

export default function MessageBubble({ message, mine, onOpenReact }: Readonly<MessageBubbleProps>) {
  const { t } = useTranslation();
  const m = message;
  // Muted ink only on the paper bubble: faded white on the red fill fails 4.5:1.
  const metaInk = mine ? 'inherit' : 'text.secondary';
  const messageContent =
    m.type === 'IMAGE' ? (
      <Box
        component="img"
        src={m.image_url}
        alt={t('mweb.chatRoom.image')}
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
      data-testid={`chat-message-${m.id}`}
      sx={{ mb: 1, justifyContent: mine ? 'flex-end' : 'flex-start', alignItems: 'flex-end' }}
    >
      {!mine && (
        <Avatar alt="" src={m.user_photo || undefined} sx={{ width: 32, height: 32 }}>
          {(m.user_name || '?').charAt(0)}
        </Avatar>
      )}
      <Paper
        // The bubble opens the reaction picker: double-click, or Enter / Space (2.1.1).
        role="button"
        tabIndex={0}
        onDoubleClick={(e) => onOpenReact(e.currentTarget, m.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenReact(e.currentTarget, m.id);
          }
        }}
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
          <Typography variant="body2" sx={{ fontStyle: 'italic', color: metaInk }}>
            deleted
          </Typography>
        ) : (
          messageContent
        )}
        <Typography variant="caption" sx={{ color: metaInk, display: 'block', mt: 0.5, textAlign: 'right' }}>
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
                data-testid={`reaction-${m.id}-${emoji}`}
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
