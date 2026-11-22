import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitDashboard } from '@duncit/dashboard';
import RangeSelect, { useRangeParam } from '../../ai-features/RangeSelect';
import PageHeader from '../shared/PageHeader';
import { ASK_DUNCIT_COST } from '../shared/queries';
import { buildCostWidgets, type AskDuncitCost } from './widgets';

/** Ask Duncit › Cost & Usage Analytics — spend and tokens by day, feature, model and role. */
export default function AskDuncitCostPage() {
  const { t } = useTranslation();
  const { formatDay } = useDateFormat();
  const [days, setDays] = useRangeParam();
  const { data, loading, error } = useQuery<{ askDuncitCost: AskDuncitCost }>(ASK_DUNCIT_COST, { variables: { days }, fetchPolicy: 'cache-and-network' });
  const c = data?.askDuncitCost;
  const widgets = useMemo(() => (c ? buildCostWidgets(c, t, formatDay) : []), [c, t, formatDay]);
  const header = (
    <Stack spacing={1}>
      <PageHeader title={t('ai.askDuncit.cost.title')} subtitle={t('ai.askDuncit.cost.subtitle')} actions={<RangeSelect value={days} onChange={setDays} />} />
      {c && c.unpriced_models.length > 0 && <Alert severity="warning">{t('ai.askDuncit.cost.unpriced', { vars: { models: c.unpriced_models.join(', ') } })}</Alert>}
    </Stack>
  );
  if (!c) {
    return (
      <Stack spacing={3}>
        {header}
        <QueryGuard loading={loading} error={error} errorText={t('ai.askDuncit.loadFailed')} spinnerSx={{ py: 6 }}>
          {() => null}
        </QueryGuard>
      </Stack>
    );
  }
  return <DuncitDashboard dashboardId="ai.askDuncit.cost" header={header} widgets={widgets} />;
}
