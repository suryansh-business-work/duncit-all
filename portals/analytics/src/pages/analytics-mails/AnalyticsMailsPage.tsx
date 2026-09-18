import { Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { PageHeader } from '@duncit/ui';
import ScheduleCard from './ScheduleCard';
import SubscribersCard from './SubscribersCard';

/**
 * Analytics > Settings > Analytics Mails: who receives the console's numbers
 * by email, with the PDF of the full report attached and a link back here,
 * and when those reports go out. The template itself is edited in Tech >
 * Email Templates (`analytics-report`).
 */
export default function AnalyticsMailsPage() {
  const { t } = useTranslation();
  return (
    <Stack spacing={3} data-testid="analytics-mails-page">
      <PageHeader title={t('analytics.mails.title')} subtitle={t('analytics.mails.subtitle')} />
      <ScheduleCard />
      <SubscribersCard />
    </Stack>
  );
}
