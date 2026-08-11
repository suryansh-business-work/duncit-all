import { useQuery } from '@apollo/client';
import { Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useTranslation } from '@duncit/shell';
import {
  MAIL_AUTOMATION_THREADS,
  type MailAutomationThread,
} from '../../graphql/mail-automation';

interface RowProps {
  thread: MailAutomationThread;
}

/** Hoisted so it is not redefined on every render (S6478). */
function ThreadRow({ thread }: Readonly<RowProps>) {
  const { t } = useTranslation();
  const when = new Date(thread.created_at).toLocaleString();

  // Three states, not two. A thread with no reply and no error was claimed but
  // never finished — the poller was interrupted between claiming it and
  // answering it. Rendering that as "reply failed: " with a blank reason reads
  // like a bug in this page rather than what actually happened.
  let status: string;
  if (thread.replied_at) {
    status = t('support.mailAutomation.recentReplied', {
      vars: { when: new Date(thread.replied_at).toLocaleString() },
    });
  } else if (thread.reply_error) {
    status = t('support.mailAutomation.recentFailed', { vars: { reason: thread.reply_error } });
  } else {
    status = t('support.mailAutomation.recentPending');
  }

  return (
    <Stack spacing={0.25} sx={{ py: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Chip size="small" label={thread.ticket_no} />
        <Typography fontWeight={700} noWrap sx={{ flex: 1, minWidth: 0 }}>
          {thread.subject}
        </Typography>
        {thread.reply_by_ai && <SmartToyIcon fontSize="small" color="action" />}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {thread.from_name || thread.from_email} · {when}
      </Typography>
      <Typography variant="caption" color={thread.replied_at ? 'text.secondary' : 'error.main'}>
        {status}
      </Typography>
    </Stack>
  );
}

/** What the mailbox has actually done. The rule above is a promise; this is
 * the record of it being kept — including the cases where the ticket opened
 * but the acknowledgement did not send. */
export default function RecentThreads({ accountId }: Readonly<{ accountId: string }>) {
  const { t } = useTranslation();
  const { data } = useQuery<{ mailAutomationThreads: MailAutomationThread[] }>(
    MAIL_AUTOMATION_THREADS,
    { variables: { account_id: accountId, limit: 20 }, fetchPolicy: 'cache-and-network' }
  );
  const rows = data?.mailAutomationThreads ?? [];

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={800}>
          {t('support.mailAutomation.recentTitle')}
        </Typography>
        {rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t('support.mailAutomation.recentEmpty')}
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />} sx={{ mt: 1 }}>
            {rows.map((thread) => (
              <ThreadRow key={thread.id} thread={thread} />
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
