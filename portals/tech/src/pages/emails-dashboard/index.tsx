import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { MenuItem, Stack, TextField } from '@mui/material';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import DistributionCard from '../telemetry-dashboard/DistributionCard';
import { RANGE_OPTIONS } from '../telemetry-dashboard/queries';
import HeadlineTiles from './HeadlineTiles';
import RepeatFailuresCard from './RepeatFailuresCard';
import SilentDiscardAlert from './SilentDiscardAlert';
import {
  EMAIL_LOG_DASHBOARD,
  labelTemplateBuckets,
  type EmailLogDashboardData,
} from './queries';
import { useTranslation } from '@duncit/app-settings';

/**
 * Emails Dashboard — did the mail get through, and if it did not, why.
 *
 * The reasons list is the page. A provider dashboard can only account for what
 * reached it, so the sends that stopped here — a template switched off, an
 * address missing, a refusal — are visible nowhere else, and they are what
 * "the customer never got the email" almost always turns out to be.
 */
export default function EmailsDashboardPage() {
  const { t } = useTranslation();
  const [rangeDays, setRangeDays] = useState(7);
  const { data, loading, error } = useQuery<{ emailLogDashboard: EmailLogDashboardData }>(
    EMAIL_LOG_DASHBOARD,
    { variables: { range_days: rangeDays }, fetchPolicy: 'cache-and-network' },
  );

  const d = data?.emailLogDashboard;
  const templateBuckets = labelTemplateBuckets(d?.not_delivered_templates ?? []);

  const header = (
    <PageHeader
      title={t('tech.emailsDashboard.emailsDashboard')}
      subtitle={t('tech.emailsDashboard.deliveryAcrossEveryEmailTheProduct')}
      actions={
        <TextField
          select
          size="small"
          label={t('tech.common.range')}
          value={rangeDays}
          onChange={(e) => setRangeDays(Number(e.target.value))}
          sx={{ minWidth: 160 }}
        >
          {RANGE_OPTIONS.map((r) => (
            <MenuItem key={r.value} value={r.value}>
              {r.label}
            </MenuItem>
          ))}
        </TextField>
      }
    />
  );

  if (!d) {
    return (
      <Stack spacing={3}>
        {header}
        <QueryGuard loading={loading && !data} error={error} errorText={error?.message} spinnerSx={{ py: 6 }}>
          {() => null}
        </QueryGuard>
      </Stack>
    );
  }

  const widgets: DashboardWidget[] = [
    {
      id: 'silent-discards',
      bare: true,
      // The alert is either absent or taller than one row — never exactly h1.
      fitContent: true,
      defaultLayout: { x: 0, y: 0, w: 12, h: 1 },
      minH: 1,
      content: <SilentDiscardAlert count={d.silently_discarded} />,
    },
    {
      id: 'headline-tiles',
      bare: true,
      fitContent: true,
      defaultLayout: { x: 0, y: 1, w: 12, h: 2 },
      minH: 2,
      content: <HeadlineTiles data={d} />,
    },
    {
      id: 'not-delivered-reasons',
      bare: true,
      // One bar per reason, and the reason count is the server's to decide.
      fitContent: true,
      defaultLayout: { x: 0, y: 3, w: 12, h: 5 },
      minW: 4,
      // minH floors the measured height — keep it low or a zero-failure day pins a void.
      minH: 2,
      content: <DistributionCard title={t('tech.emailsDashboard.whyNothingWentOut')} buckets={d.not_delivered_reasons} />,
    },
    {
      id: 'not-delivered-templates',
      bare: true,
      fitContent: true,
      defaultLayout: { x: 0, y: 8, w: 6, h: 5 },
      minW: 3,
      minH: 2,
      content: <DistributionCard title={t('tech.emailsDashboard.templatesThatDidNotDeliver')} buckets={templateBuckets} />,
    },
    {
      id: 'repeat-failures',
      bare: true,
      fitContent: true,
      defaultLayout: { x: 6, y: 8, w: 6, h: 5 },
      minW: 3,
      minH: 2,
      content: <RepeatFailuresCard rows={d.repeat_failures} />,
    },
  ];

  return <DuncitDashboard dashboardId="tech.emails" header={header} widgets={widgets} />;
}
