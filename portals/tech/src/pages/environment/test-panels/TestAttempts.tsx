import { Alert } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import type { EnvTestAttempts } from '../queries';

/**
 * How many tests this entry has spent and how many are left, shown above every
 * test and re-read after each one. A test is a real sign-in at the vendor, so
 * the last few are worth knowing about before they are gone.
 */
export default function TestAttempts({ attempts }: Readonly<{ attempts: EnvTestAttempts | null }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  if (!attempts) return null;
  const { used, max, left, window_hours: hours, resets_at: resetsAt } = attempts;
  const limited = max > 0;
  const count = limited
    ? t('tech.environment.attemptsLimited', { vars: { max, hours, used, left: left ?? 0 } })
    : t('tech.environment.attemptsUnlimited', { vars: { hours, used } });
  const none = limited && left === 0;
  return (
    <Alert severity={none ? 'warning' : 'info'} role="status" sx={{ mb: 2 }} data-testid="env-test-attempts">
      {count}
      {none ? ` ${t('tech.environment.attemptsNoneLeft')}` : ''}
      {limited && resetsAt ? ` ${t('tech.environment.attemptsResets', { vars: { when: formatDateTime(resetsAt) } })}` : ''}
    </Alert>
  );
}
