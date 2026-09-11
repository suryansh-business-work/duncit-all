import { Alert, LinearProgress, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { contactLoadStatus, progressPercent, type ContactPagesState } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface BarProps {
  /** The sentence the bar stands for; it is also the bar's accessible name. */
  label: string;
  percent: number;
  testId: string;
}

/** A slim bar under the sentence it stands for — the sync's, and a list's
 * while its later pages stream in. Twin of native `ContactsProgress` (rule 27). */
export function ContactsProgress({ label, percent, testId }: Readonly<BarProps>) {
  return (
    <Stack spacing={0.75} data-testid={testId}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <LinearProgress variant="determinate" value={percent} aria-label={label} />
    </Stack>
  );
}

/**
 * Where a list that is already on screen has got to — which of the four
 * `contactLoadStatus` answers, drawn in MUI. Twin of native
 * `ContactsLoadProgress` (rule 27).
 */
export function ContactsLoadProgress({
  pages,
  onRetry,
}: Readonly<{ pages: ContactPagesState<unknown>; onRetry: () => void }>) {
  const { t } = useTranslation();
  const status = contactLoadStatus(pages);
  if (status === 'IDLE') return null;
  if (status === 'REFRESHING') {
    return <LinearProgress aria-label={t('mweb.contacts.syncing')} data-testid="contacts-list-refreshing" />;
  }
  if (status === 'FAILED') {
    return (
      <Alert
        severity="error"
        data-testid="contacts-load-failed"
        action={
          <DuncitButton color="inherit" size="small" onClick={onRetry} data-testid="contacts-load-retry">
            {t('mweb.contacts.loadRetry')}
          </DuncitButton>
        }
      >
        {t('mweb.contacts.loadMoreFailed')}
      </Alert>
    );
  }
  const loaded = pages.rows.length;
  return (
    <ContactsProgress
      testId="contacts-load-progress"
      label={t('mweb.contacts.loadProgress', { vars: { loaded, total: pages.total } })}
      percent={progressPercent(loaded, pages.total)}
    />
  );
}
