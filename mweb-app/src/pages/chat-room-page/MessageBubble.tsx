import { Avatar, Box, Paper, Stack, Typography } from '@mui/material';

interface MessageBubbleProps {
  message: any;
  mine: boolean;
  onOpenReact: (el: HTMLElement, id: string) => void;
}

export default function MessageBubble({ message, mine, onOpenReact }: MessageBubbleProps) {
  const m = message;
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ mb: 1, justifyContent: mine ? 'flex-end' : 'flex-start' }}
    >
      {!mine && (
        <Avatar src={m.user_photo || undefined} sx={{ width: 32, height: 32 }}>
          {(m.user_name || '?').charAt(0)}
        </Avatar>
      )}
      <Paper
        onDoubleClick={(e) => onOpenReact(e.currentTarget, m.id)}
        sx={{
          p: 1,
          px: 1.5,
          maxWidth: '78%',
          bgcolor: mine ? 'primary.main' : 'background.paper',
          color: mine ? 'primary.contrastText' : 'text.primary',
          borderRadius: 2,
          cursor: 'pointer',
        }}
      >
        {!mine && (
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, opacity: 0.7, display: 'block' }}
          >
            {m.user_name || 'User'}
          </Typography>
        )}
        {m.deleted ? (
          <Typography variant="body2" sx={{ fontStyle: 'italic', opacity: 0.7 }}>
            deleted
          </Typography>
        ) : m.type === 'IMAGE' ? (
          <Box
            component="img"
            src={m.image_url}
            alt=""
            sx={{ maxWidth: 240, maxHeight: 240, borderRadius: 1, display: 'block' }}
          />
        ) : (
          <Typography
            variant="body2"
            sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {m.text}
          </Typography>
        )}
        <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', mt: 0.5 }}>
          {new Date(m.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
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
                  borderRadius: 5,
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
