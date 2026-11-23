import { Alert, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '../i18n/useTranslation';
import { AlternativeVerificationForm } from './alternative-verification';
import type { ExceptionStatus } from './documents';

interface Props {
  exception: ExceptionStatus | null;
  busy: boolean;
  error: string | null;
  onRequest: (reason: string) => Promise<void>;
}

/** Whether a new request can be made: none yet, or the last one is over. */
const canAskAgain = (exception: ExceptionStatus | null) =>
  exception === null || ['REJECTED', 'USED', 'EXPIRED'].includes(exception.status);

/**
 * What to do when a location cannot or will not be shared. It is an
 * administrator's decision, not a button: the request is recorded, a person
 * reviews it, and only an approval lets the sign-in continue without a fix.
 */
export function AlternativePanel({ exception, busy, error, onRequest }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  return (
    <Stack spacing={1.5} data-testid="security-alternative">
      <Typography variant="subtitle2" component="h3">
        {t('shell.securityVerification.alternative.title')}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('shell.securityVerification.alternative.body')}
      </Typography>
      {exception?.status === 'PENDING' && (
        <Alert severity="info" role="status" data-testid="security-alternative-pending">
          {t('shell.securityVerification.alternative.pending')}
        </Alert>
      )}
      {exception?.status === 'APPROVED' && (
        <Alert severity="success" role="status" data-testid="security-alternative-approved">
          {t('shell.securityVerification.alternative.approved', {
            vars: { until: exception.expires_at ? formatDateTime(exception.expires_at) : '' },
          })}
        </Alert>
      )}
      {exception?.status === 'REJECTED' && (
        <Alert severity="error" role="alert" data-testid="security-alternative-rejected">
          {exception.decision_note
            ? t('shell.securityVerification.alternative.rejectedWithNote', { vars: { note: exception.decision_note } })
            : t('shell.securityVerification.alternative.rejected')}
        </Alert>
      )}
      {(exception?.status === 'USED' || exception?.status === 'EXPIRED') && (
        <Alert severity="warning" role="status">
          {t('shell.securityVerification.alternative.over')}
        </Alert>
      )}
      {error && (
        <Alert severity="error" role="alert" data-testid="security-alternative-error">
          {error}
        </Alert>
      )}
      {canAskAgain(exception) && <AlternativeVerificationForm onSubmit={onRequest} busy={busy} />}
    </Stack>
  );
}
