import { Avatar, Chip, Paper, Stack, Typography } from '@mui/material';
import { format } from 'date-fns';
import type { SupportChatMessage } from '../../graphql/supportChat';

/** The scrollable message stack — agent right, user left, SYSTEM centered
 * (e.g. "Picked up by Agent Name"). */
export default function ChatMessages({ messages }: Readonly<{ messages: SupportChatMessage[] }>) {
  return (
    <Stack spacing={1.25}>
      {messages.map((m) => {
        if (m.sender_role === 'SYSTEM') {
          return (
            <Stack key={m.id} direction="row" sx={{ justifyContent: 'center' }}>
              <Chip size="small" label={m.text} color="info" variant="outlined" />
            </Stack>
          );
        }
        const isAgent = m.sender_role === 'AGENT';
        return (
          <Stack key={m.id} direction="row" sx={{ justifyContent: isAgent ? 'flex-end' : 'flex-start' }}>
            <Paper
              variant="outlined"
              sx={{
                p: 1,
                px: 1.25,
                maxWidth: '70%',
                bgcolor: isAgent ? 'primary.main' : 'background.paper',
                color: isAgent ? 'primary.contrastText' : 'text.primary',
                borderColor: isAgent ? 'primary.main' : 'divider',
              }}
            >
              {m.text && <Typography variant="body2">{m.text}</Typography>}
              {m.attachments.length > 0 && (
                <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 0.5, mt: m.text ? 0.5 : 0 }}>
                  {m.attachments.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                      <Avatar variant="rounded" src={url} sx={{ width: 52, height: 52 }} />
                    </a>
                  ))}
                </Stack>
              )}
              <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.25 }}>
                {format(new Date(m.created_at), 'HH:mm')}
              </Typography>
            </Paper>
          </Stack>
        );
      })}
    </Stack>
  );
}
