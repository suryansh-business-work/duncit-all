import { useEffect, useRef, useState } from 'react';
import { Alert, Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { AutomationRun, RunMessage } from '../types';
import EmailPreviewDialog from './EmailPreviewDialog';
import MessageBubble from './MessageBubble';

interface Props {
  run: AutomationRun;
}

/** The status line under the last message, when the run is not simply going on. */
function StatusLine({ run }: Readonly<Props>) {
  const { t } = useTranslation();
  switch (run.status) {
    case 'WAITING_REPLY':
      return <Alert severity="info">{t('ai.automation.test.waiting')}</Alert>;
    case 'COMPLETED':
      return <Alert severity="success">{t('ai.automation.test.completed')}</Alert>;
    case 'FAILED':
      return <Alert severity="error">{t('ai.automation.test.failed', { vars: { error: run.error } })}</Alert>;
    case 'CANCELLED':
      return <Alert severity="warning">{t('ai.automation.test.cancelled')}</Alert>;
    default:
      return null;
  }
}

/** The conversation so far, newest at the bottom and kept in view. */
export default function ChatTranscript({ run }: Readonly<Props>) {
  const [email, setEmail] = useState<RunMessage | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [run.messages.length, run.status]);

  return (
    <Stack spacing={1} sx={{ p: 1.5 }} role="log" aria-live="polite" data-testid="automation-transcript">
      {run.messages.map((message) => (
        <MessageBubble key={message.id} message={message} onOpenEmail={setEmail} />
      ))}
      <StatusLine run={run} />
      <div ref={endRef} />
      <EmailPreviewDialog message={email} onClose={() => setEmail(null)} />
    </Stack>
  );
}
