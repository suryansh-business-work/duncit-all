import { Avatar, Box, Chip, Stack, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import AttachmentList from '../../components/AttachmentList';
import { bubbleRadiusSx } from '../support-chat/calmStyles';
import { useTranslation } from '../../i18n/useTranslation';
import type { TicketMessage } from './queries';

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
  const { t } = useTranslation();
  if (msg.author_role === 'SYSTEM') {
    return (
      <Stack
        data-testid={`ticket-msg-${msg.id}`}
        sx={{
          alignItems: "center",
          my: 0.5
        }}>
        <Chip
          size="small"
          label={msg.body_text}
          sx={{ bgcolor: 'action.hover', color: 'text.secondary', height: 'auto', py: 0.5, '& .MuiChip-label': { whiteSpace: 'normal', textAlign: 'center' } }}
        />
      </Stack>
    );
  }

  const isUser = msg.author_role === 'USER';
  const seen =
    !!agentLastReadAt && new Date(agentLastReadAt).getTime() >= new Date(msg.created_at).getTime();
  return (
    <Stack
      data-testid={`ticket-msg-${msg.id}`}
      direction="row"
      sx={{ justifyContent: isUser ? 'flex-end' : 'flex-start', alignItems: 'flex-end' }}
      spacing={1}
    >
      {!isUser && (
        <Avatar alt="" src={msg.author_photo || undefined} sx={{ width: 28, height: 28, fontSize: 12 }}>
          {msg.author_name?.[0]?.toUpperCase() || 'S'}
        </Avatar>
      )}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          maxWidth: '78%',
          ...bubbleRadiusSx(isUser),
          bgcolor: isUser ? 'primary.main' : 'background.paper',
          color: isUser ? 'primary.contrastText' : 'text.primary',
          border: isUser ? 0 : '1px solid var(--duncit-card-border)',
        }}
      >
        {!isUser && (
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            {msg.author_name || 'Support'}
          </Typography>
        )}
        <Typography variant="body2">{msg.body_text}</Typography>
        <AttachmentList urls={msg.attachments} size={54} />
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            alignItems: "center",
            justifyContent: "flex-end",
            mt: 0.25
          }}>
          <Typography variant="caption" sx={{ color: isUser ? 'inherit' : 'text.secondary' }}>
            {timeText}
          </Typography>
          {isUser &&
            (seen ? (
              <DoneAllIcon
                data-testid={`ticket-tick-${msg.id}`}
                titleAccess={t('mweb.a11y.messageSeen')}
                sx={{ fontSize: 15 }}
              />
            ) : (
              <CheckIcon
                data-testid={`ticket-tick-${msg.id}`}
                titleAccess={t('mweb.a11y.messageSent')}
                sx={{ fontSize: 15 }}
              />
            ))}
        </Stack>
      </Box>
    </Stack>
  );
}
