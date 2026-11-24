import { Box, Chip, Link, Stack, Typography } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import type { SocialMessage } from '../dm.queries';

interface Props {
  messages: readonly SocialMessage[];
}

/** One message as a chat bubble: the person's on the left, Duncit's on the right, a refused one marked with why. */
function Bubble({ message }: Readonly<{ message: SocialMessage }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const ours = message.direction === 'OUT';
  const failed = message.status === 'FAILED';
  return (
    <Stack sx={{ alignItems: ours ? 'flex-end' : 'flex-start' }} data-testid={`dm-message-${message.id}`}>
      <Box
        sx={{
          maxWidth: '85%',
          px: 1.5,
          py: 1,
          borderRadius: 2,
          bgcolor: ours ? 'primary.main' : 'action.hover',
          color: ours ? 'primary.contrastText' : 'text.primary',
          opacity: failed ? 0.7 : 1,
        }}
      >
        {message.text && (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message.text}
          </Typography>
        )}
        {message.attachments.map((attachment) => (
          <Link
            key={attachment.url}
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            color="inherit"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <AttachFileIcon fontSize="inherit" />
            {t('marketing.inbox.dmAttachment', { vars: { type: attachment.type } })}
          </Link>
        ))}
      </Box>
      <Stack direction="row" spacing={0.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 0.25 }}>
        <Typography variant="caption" color="text.secondary">
          {[ours ? message.sent_by_name : '', message.sent_at ? formatDateTime(message.sent_at) : ''].filter(Boolean).join(' · ')}
        </Typography>
        {message.automated && <Chip size="small" variant="outlined" label={t('marketing.inbox.dmAutomated')} />}
        {message.tag === 'HUMAN_AGENT' && <Chip size="small" variant="outlined" label={t('marketing.inbox.dmHumanAgent')} />}
      </Stack>
      {failed && (
        <Typography variant="caption" color="error" data-testid={`dm-failed-${message.id}`}>
          {t('marketing.inbox.replyFailed', { vars: { error: message.error } })}
        </Typography>
      )}
    </Stack>
  );
}

/** The conversation, oldest first, as the network shows it. */
export default function ConversationMessages({ messages }: Readonly<Props>) {
  const { t } = useTranslation();
  if (messages.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('marketing.inbox.dmNoMessages')}
      </Typography>
    );
  }
  return (
    <Stack spacing={1.5} role="log" aria-label={t('marketing.inbox.dmThreadLabel')} data-testid="dm-messages">
      {messages.map((message) => (
        <Bubble key={message.id} message={message} />
      ))}
    </Stack>
  );
}
