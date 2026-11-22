import { Alert, AlertTitle } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { ClubHostsSummary } from './queries';

/**
 * The warning above the table: how many hosts have gone quiet and what to do
 * about it. Counted over EVERY host of the club (the summary query), not the
 * page on screen. Says so plainly when nobody needs a call.
 */
export default function InactiveHostsAlert({ summary }: Readonly<{ summary: ClubHostsSummary }>) {
  const { t } = useTranslation();
  if (summary.host_count === 0) return null;
  if (summary.inactive_count === 0) {
    return (
      <Alert severity="success" data-testid="club-hosts-all-active">
        {t('clubAdmin.hosts.allActive', { vars: { days: summary.inactivity_days } })}
      </Alert>
    );
  }
  return (
    <Alert severity="warning" data-testid="club-hosts-inactive-alert">
      <AlertTitle>
        {t('clubAdmin.hosts.inactiveTitle', {
          count: summary.inactive_count,
          vars: { days: summary.inactivity_days },
        })}
      </AlertTitle>
      {t('clubAdmin.hosts.inactiveBody')}
    </Alert>
  );
}
