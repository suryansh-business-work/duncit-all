import { Alert, Stack } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import type { SocialConversation } from '../dm.queries';

interface Props {
  conversation: SocialConversation;
}

const SEVERITY = { OPEN: 'success', HUMAN_AGENT: 'warning', CLOSED: 'info' } as const;

/**
 * Meta's messaging window for this person, in words: free replies until a
 * time, a person's reply only until a later time, or nothing at all. The
 * server enforces it; this says why Send is or is not there before anyone
 * types. An opted-out person is named too — no automation reaches them.
 */
export default function WindowNotice({ conversation }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const time = conversation.window_closes_at ? formatDateTime(conversation.window_closes_at) : '';
  const message = {
    OPEN: t('marketing.inbox.windowOpenUntil', { vars: { time } }),
    HUMAN_AGENT: t('marketing.inbox.windowHumanAgentUntil', { vars: { time } }),
    CLOSED: t('marketing.inbox.windowClosedBody'),
  }[conversation.window_state];
  return (
    <Stack spacing={1} data-testid="dm-window">
      <Alert severity={SEVERITY[conversation.window_state]} data-testid={`dm-window-${conversation.window_state}`}>
        {message}
      </Alert>
      {conversation.opted_out && (
        <Alert severity="info" data-testid="dm-opted-out">
          {t('marketing.inbox.optedOut')}
        </Alert>
      )}
    </Stack>
  );
}
