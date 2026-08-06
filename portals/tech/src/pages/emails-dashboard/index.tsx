import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { MenuItem, Stack, TextField } from '@mui/material';
import { PageHeader, QueryGuard } from '@duncit/ui';
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

/**
 * Emails Dashboard — did the mail get through, and if it did not, why.
 *
 * The reasons list is the page. A provider dashboard can only account for what
 * reached it, so the sends that stopped here — a template switched off, an
 * address missing, a refusal — are visible nowhere else, and they are what
 * "the customer never got the email" almost always turns out to be.
 */
export default function EmailsDashboardPage() {
  const [rangeDays, setRangeDays] = useState(7);
  const { data, loading, error } = useQuery<{ emailLogDashboard: EmailLogDashboardData }>(
    EMAIL_LOG_DASHBOARD,
    { variables: { range_days: rangeDays }, fetchPolicy: 'cache-and-network' },
  );

  const d = data?.emailLogDashboard;
  const templateBuckets = labelTemplateBuckets(d?.not_delivered_templates ?? []);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Emails Dashboard"
        subtitle="Delivery across every email the product tried to send, including the attempts that never left."
        actions={
          <TextField
            select
            size="small"
            label="Range"
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

      <QueryGuard
        loading={loading && !data}
        error={error}
        errorText={error?.message}
        spinnerSx={{ py: 6 }}
      >
        {d && (
          <Stack spacing={3}>
            <SilentDiscardAlert count={d.silently_discarded} />
            <HeadlineTiles data={d} />
            <DistributionCard title="Why nothing went out" buckets={d.not_delivered_reasons} />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="flex-start">
              <DistributionCard title="Templates that did not deliver" buckets={templateBuckets} />
              <RepeatFailuresCard rows={d.repeat_failures} />
            </Stack>
          </Stack>
        )}
      </QueryGuard>
    </Stack>
  );
}
