import { Alert, Typography } from '@mui/material';
import { StatCard } from '@duncit/ui';
import type { DashboardWidget } from '@duncit/dashboard';
import PaymentsIcon from '@mui/icons-material/Payments';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import TokenIcon from '@mui/icons-material/Token';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { usd, tokens } from '../../lib/usd';
import SpendBars, { type SpendBarRow } from './SpendBars';
import TaskSpendTable from './TaskSpendTable';
import RateCardList from './RateCardList';
import type { ModelPrice, SpendBucket, UsageDashboardData } from './queries';
import { formatDateTime } from '@duncit/app-settings';

const bucketRows = (buckets: readonly SpendBucket[]): SpendBarRow[] =>
  buckets.map((b) => ({ id: b.key, label: b.key, cost_usd: b.cost_usd, calls: b.calls, tokens: b.tokens }));

const kpi = (id: string, x: number, content: DashboardWidget['content']): DashboardWidget => ({
  id,
  bare: true,
  defaultLayout: { x, y: 0, w: 3, h: 2 },
  minW: 2,
  minH: 2,
  content,
});

/** A model with no rate records tokens at zero cost, so the total below it is a floor. */
function UnpricedNotice({ models }: Readonly<{ models: readonly string[] }>) {
  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      <Typography variant="body2">
        No rate card entry for {models.join(', ')} — those calls are counted but costed at zero. Add
        a rate below and future calls will be priced.
      </Typography>
    </Alert>
  );
}

export const unpricedNotice = (models: readonly string[]) =>
  models.length > 0 ? <UnpricedNotice models={models} /> : null;

export function buildWidgets(
  d: UsageDashboardData,
  onEditRate: (price: ModelPrice | null) => void
): DashboardWidget[] {
  const failed = d.failed_calls + d.skipped_calls;
  const trend: SpendBarRow[] = d.series.map((p) => ({
    id: p.date,
    label: p.date,
    cost_usd: p.cost_usd,
    calls: p.calls,
    tokens: p.tokens,
  }));

  return [
    kpi(
      'cost',
      0,
      <StatCard
        sx={{ height: '100%' }}
        icon={<PaymentsIcon fontSize="small" />}
        label="SPEND"
        value={usd(d.total_cost_usd)}
        hint={`${usd(d.all_time_cost_usd)} all time`}
      />
    ),
    kpi(
      'calls',
      3,
      <StatCard
        sx={{ height: '100%' }}
        icon={<SmartToyIcon fontSize="small" />}
        label="CALLS"
        value={formatDateTime(d.total_calls)}
        hint={`${d.avg_duration_ms} ms average`}
      />
    ),
    kpi(
      'tokens',
      6,
      <StatCard
        sx={{ height: '100%' }}
        icon={<TokenIcon fontSize="small" />}
        label="TOKENS"
        value={tokens(d.total_tokens)}
        hint={`${tokens(d.prompt_tokens)} in · ${tokens(d.completion_tokens)} out`}
      />
    ),
    kpi(
      'failures',
      9,
      <StatCard
        sx={{ height: '100%' }}
        icon={<ErrorOutlineIcon fontSize="small" />}
        label="NO ANSWER"
        value={failed.toLocaleString()}
        hint={`${d.failed_calls} failed · ${d.skipped_calls} not configured`}
      />
    ),
    {
      id: 'by-task',
      title: 'Cost per task',
      disablePadding: true,
      defaultLayout: { x: 0, y: 2, w: 12, h: 8 },
      minW: 4,
      minH: 4,
      content: <TaskSpendTable rows={d.by_task} />,
    },
    {
      id: 'by-module',
      title: 'By area',
      fitContent: true,
      defaultLayout: { x: 0, y: 10, w: 4, h: 5 },
      minW: 3,
      minH: 2,
      content: <SpendBars rows={bucketRows(d.by_module)} emptyText="No calls in this range." />,
    },
    {
      id: 'by-model',
      title: 'By model',
      fitContent: true,
      defaultLayout: { x: 4, y: 10, w: 4, h: 5 },
      minW: 3,
      minH: 2,
      content: <SpendBars rows={bucketRows(d.by_model)} emptyText="No calls in this range." />,
    },
    {
      id: 'rates',
      title: 'Model rates',
      fitContent: true,
      defaultLayout: { x: 8, y: 10, w: 4, h: 5 },
      minW: 3,
      minH: 2,
      content: <RateCardList prices={d.prices} onEdit={onEditRate} />,
    },
    {
      id: 'trend',
      title: 'Daily spend',
      fitContent: true,
      defaultLayout: { x: 0, y: 15, w: 12, h: 6 },
      minW: 4,
      minH: 3,
      content: <SpendBars rows={trend} emptyText="No calls in this range." />,
    },
  ];
}
