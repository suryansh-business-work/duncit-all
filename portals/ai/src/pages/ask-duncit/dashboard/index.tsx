import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitDashboard } from '@duncit/dashboard';
import RangeSelect, { useRangeParam } from '../../ai-features/RangeSelect';
import PageHeader from '../shared/PageHeader';
import { ASK_DUNCIT_DASHBOARD } from '../shared/queries';
import { buildDashboardWidgets, type AskDuncitDashboard } from './widgets';

/**
 * Ask Duncit › Dashboard — conversations, active users, resolution rate,
 * response time, tokens, cost, tool usage, failed actions, satisfaction,
 * violations and role-wise usage, over the chosen range.
 */
export default function AskDuncitDashboardPage() {
  const { t } = useTranslation();
  const { formatDay } = useDateFormat();
  const [days, setDays] = useRangeParam();
  const { data, loading, error } = useQuery<{ askDuncitDashboard: AskDuncitDashboard }>(ASK_DUNCIT_DASHBOARD, {
    variables: { days },
    fetchPolicy: 'cache-and-network',
  });
  const d = data?.askDuncitDashboard;
  const widgets = useMemo(() => (d ? buildDashboardWidgets(d, t, formatDay) : []), [d, t, formatDay]);
  const header = <PageHeader title={t('ai.askDuncit.dashboard.title')} subtitle={t('ai.askDuncit.dashboard.subtitle')} actions={<RangeSelect value={days} onChange={setDays} />} />;

  if (!d) {
    return (
      <Stack spacing={3}>
        {header}
        <QueryGuard loading={loading} error={error} errorText={t('ai.askDuncit.loadFailed')} spinnerSx={{ py: 6 }}>
          {() => null}
        </QueryGuard>
      </Stack>
    );
  }
  return <DuncitDashboard dashboardId="ai.askDuncit" header={header} widgets={widgets} />;
}
