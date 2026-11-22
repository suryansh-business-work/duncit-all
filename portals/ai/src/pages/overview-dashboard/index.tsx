import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitDashboard } from '@duncit/dashboard';
import { useRangeParam } from '../ai-features/RangeSelect';
import OverviewHeader from './OverviewHeader';
import { buildOverviewWidgets } from './widgets';
import { AI_OVERVIEW_DASHBOARD, OVERVIEW_POLL_MS, type AiOverviewDashboardQuery } from './queries';

/**
 * Dashboard — the AI portal's landing page: how AI is used across the
 * platform over a range (`?days=`, the same window as the other AI
 * dashboards), against the previous period of the same length.
 *
 * One query feeds every widget, read again every minute while the page is
 * open. A failed refresh keeps the last figures on screen and says when they
 * were read; a failed first load offers Retry.
 */
export default function AiOverviewDashboardPage() {
  const { t } = useTranslation();
  const { formatDay } = useDateFormat();
  const [rangeDays, setRangeDays] = useRangeParam();
  const { data, loading, error, refetch } = useQuery<AiOverviewDashboardQuery>(AI_OVERVIEW_DASHBOARD, {
    variables: { range_days: rangeDays },
    fetchPolicy: 'cache-and-network',
    pollInterval: OVERVIEW_POLL_MS,
  });
  const d = data?.aiOverviewDashboard;
  const widgets = useMemo(() => (d ? buildOverviewWidgets(d, t, formatDay) : []), [d, t, formatDay]);

  const header = (
    <OverviewHeader
      rangeDays={rangeDays}
      onRangeChange={setRangeDays}
      dashboard={d}
      failed={Boolean(error)}
      onRetry={() => {
        // A retry that fails again lands in the query's own `error`, which the
        // header shows — the rejection itself has nothing more to say.
        refetch().catch(() => undefined);
      }}
    />
  );

  if (!d) {
    return (
      <Stack spacing={3}>
        {header}
        <QueryGuard loading={loading} spinnerSx={{ py: 6 }}>
          {() => null}
        </QueryGuard>
      </Stack>
    );
  }
  return <DuncitDashboard dashboardId="ai.home" header={header} widgets={widgets} />;
}
