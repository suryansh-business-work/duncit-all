import { CircularProgress } from '@mui/material';
import { formatDateTime } from '@duncit/datetime';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { EmailStatusChip } from './EmailStatusChip';
import { useEmailStatus } from './useEmailStatus';

export interface EmailStatusBadgeProps {
  email: string | null | undefined;
}

/**
 * The verification status beside an email anywhere in the CRM — a green tick
 * for a verified mailbox, "Not checked" until someone checks it. Clicking it
 * runs a check now (or again).
 */
export function EmailStatusBadge({ email }: Readonly<EmailStatusBadgeProps>) {
  const { t } = useTranslation();
  const { entry, verify } = useEmailStatus(email);
  if (!email?.trim() || !entry?.status) return null;
  if (entry.checking) {
    return <CircularProgress size={14} aria-label={t('crm.emailVerifier.checking')} data-testid="email-status-checking" />;
  }

  const checked = entry.checkedAt
    ? t('crm.emailVerifier.checkedAt', { vars: { date: formatDateTime(entry.checkedAt) } })
    : t('crm.emailVerifier.clickToCheck');
  const suggestion = entry.suggestion ? t('crm.emailVerifier.didYouMean', { vars: { email: entry.suggestion } }) : '';

  return (
    <EmailStatusChip
      status={entry.status}
      tooltip={[checked, suggestion].filter(Boolean).join(' · ')}
      onClick={(event) => {
        // Badges sit inside clickable rows and cards — checking must not open them.
        event.stopPropagation();
        fireAndForget(verify(), logs.portal.crm, 'EmailStatusBadge', 'verify');
      }}
    />
  );
}
