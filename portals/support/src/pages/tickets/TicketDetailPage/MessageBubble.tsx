import { Avatar, Box, Chip, Paper, Stack, Typography } from '@mui/material';
import type { TicketMessage } from '../../../graphql/tickets';

interface Props {
  msg: TicketMessage;
  time: string;
}

/** A ticket thread entry — SYSTEM rows render as a centered timeline chip;
 * USER/AGENT render as left/right bubbles with a tz-aware timestamp. */
export default function MessageBubble({ msg, time }: Readonly<Props>) {
  if (msg.author_role === 'SYSTEM') {
    return (
      <Stack direction="row" sx={{ justifyContent: 'center' }}>
        <Chip size="small" label={msg.body_text} color="info" variant="outlined" />
      </Stack>
    );
  }
  const isAgent = msg.author_role === 'AGENT';
  return (
    <Stack direction="row" spacing={1.25} sx={{ flexDirection: isAgent ? 'row-reverse' : 'row' }}>
      <Avatar src={msg.author_photo || undefined} sx={{ width: 32, height: 32, fontSize: 13 }}>
        {msg.author_name?.[0]?.toUpperCase() || '?'}
      </Avatar>
      <Paper
        variant="outlined"
        sx={{
          p: 1.25,
          maxWidth: '75%',
          bgcolor: isAgent ? 'primary.main' : 'background.paper',
          color: isAgent ? 'primary.contrastText' : 'text.primary',
          borderColor: isAgent ? 'primary.main' : 'divider',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {msg.author_name || (isAgent ? 'Support' : 'User')}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {time}
          </Typography>
        </Stack>
        {msg.body_html ? (
          <Box sx={{ '& p': { m: 0 }, fontSize: 14 }} dangerouslySetInnerHTML={{ __html: msg.body_html }} />
        ) : (
          <Typography variant="body2">{msg.body_text}</Typography>
        )}
        {msg.attachments.length > 0 && (
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {msg.attachments.map((url) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                <Avatar variant="rounded" src={url} sx={{ width: 56, height: 56 }} />
              </a>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
