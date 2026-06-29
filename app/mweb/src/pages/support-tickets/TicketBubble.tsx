import { Avatar, Chip, Paper, Stack, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import type { TicketMessage } from './queries';

const SEEN_BLUE = '#34b7f1';

interface Props {
  msg: TicketMessage;
  /** Pre-formatted, timezone-aware send time (B10). */
  timeText: string;
  /** When the support agent last opened the thread — flips the user's Sent ticks to Seen (B12). */
  agentLastReadAt?: string | null;
}

/** A single message bubble in the ticket thread (B7 renders SYSTEM as a chip).
 * The user's own messages carry a Sent (✓) / Seen (✓✓ blue) tick like the live chat (B12). */
export default function TicketBubble({ msg, timeText, agentLastReadAt }: Readonly<Props>) {
  if (msg.author_role === 'SYSTEM') {
    return (
      <Stack alignItems="center" sx={{ my: 0.5 }}>
        <Chip
          size="small"
          label={msg.body_text}
          sx={{ bgcolor: 'action.hover', fontWeight: 700, height: 'auto', py: 0.5, '& .MuiChip-label': { whiteSpace: 'normal', textAlign: 'center' } }}
        />
      </Stack>
    );
  }

  const isUser = msg.author_role === 'USER';
  const seen =
    !!agentLastReadAt && new Date(agentLastReadAt).getTime() >= new Date(msg.created_at).getTime();
  return (
    <Stack direction="row" sx={{ justifyContent: isUser ? 'flex-end' : 'flex-start' }} spacing={1}>
      {!isUser && (
        <Avatar src={msg.author_photo || undefined} sx={{ width: 28, height: 28, fontSize: 12 }}>
          {msg.author_name?.[0]?.toUpperCase() || 'S'}
        </Avatar>
      )}
      <Paper
        variant="outlined"
        sx={{
          p: 1.25,
          maxWidth: '78%',
          borderRadius: 3,
          bgcolor: isUser ? 'primary.main' : 'background.paper',
          color: isUser ? 'primary.contrastText' : 'text.primary',
        }}
      >
        {!isUser && (
          <Typography variant="caption" sx={{ fontWeight: 800 }}>
            {msg.author_name || 'Support'}
          </Typography>
        )}
        <Typography variant="body2">{msg.body_text}</Typography>
        {msg.attachments.length > 0 && (
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
            {msg.attachments.map((url) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                <Avatar variant="rounded" src={url} sx={{ width: 54, height: 54 }} />
              </a>
            ))}
          </Stack>
        )}
        <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5} sx={{ mt: 0.25 }}>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {timeText}
          </Typography>
          {isUser &&
            (seen ? (
              <DoneAllIcon sx={{ fontSize: 15, color: SEEN_BLUE }} />
            ) : (
              <CheckIcon sx={{ fontSize: 15, opacity: 0.7 }} />
            ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
