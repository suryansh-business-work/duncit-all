import { Alert, Typography } from '@mui/material';
import { StatCard } from '@duncit/ui';
import type { DashboardWidget } from '@duncit/dashboard';
import type { useTranslation } from '@duncit/shell';
import PaymentsIcon from '@mui/icons-material/Payments';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import TokenIcon from '@mui/icons-material/Token';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import { usd, tokens } from '../../lib/usd';
import SpendBars, { type SpendBarRow } from './SpendBars';
import TaskSpendTable from './TaskSpendTable';
import RateCardList from './RateCardList';
import type { ModelPrice, SpendBucket, UsageDashboardData } from './queries';
import { formatDateTime } from '@duncit/app-settings';

/** The translate function the page hands down — these are plain builders, not
 *  components, so they cannot call the hook themselves. */
type Translate = ReturnType<typeof useTranslation>['t'];

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
function UnpricedNotice({ models, t }: Readonly<{ models: readonly string[]; t: Translate }>) {
  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      <Typography variant="body2">
        {/* The model names are what the server recorded — substituted, never
            translated, so the row here matches the row on the rate card. */}
        {t('ai.dashboard.unpriced', { vars: { models: models.join(', ') } })}
      </Typography>
    </Alert>
  );
}

export const unpricedNotice = (models: readonly string[], t: Translate) =>
  models.length > 0 ? <UnpricedNotice models={models} t={t} /> : null;

export function buildWidgets(
  d: UsageDashboardData,
  onEditRate: (price: ModelPrice | null) => void,
  t: Translate
): DashboardWidget[] {
  const failed = d.failed_calls + d.skipped_calls;
  const trend: SpendBarRow[] = d.series.map((p) => ({
    id: p.date,
    label: p.date,
    cost_usd: p.cost_usd,
    calls: p.calls,
    tokens: p.tokens,
  }));
  const noCalls = t('ai.dashboard.noCallsInRange');

  return [
    kpi(
      'cost',
      0,
      <StatCard
        sx={{ height: '100%' }}
        icon={<PaymentsIcon fontSize="small" />}
        label={t('ai.dashboard.kpiSpend')}
        value={usd(d.total_cost_usd)}
        hint={t('ai.dashboard.kpiSpendHint', { vars: { amount: usd(d.all_time_cost_usd) } })}
      />
    ),
    kpi(
      'calls',
      3,
      <StatCard
        sx={{ height: '100%' }}
        icon={<SmartToyIcon fontSize="small" />}
        label={t('ai.dashboard.kpiCalls')}
        value={formatDateTime(d.total_calls)}
        hint={t('ai.dashboard.kpiCallsHint', { vars: { ms: d.avg_duration_ms } })}
      />
    ),
    kpi(
      'tokens',
      6,
      <StatCard
        sx={{ height: '100%' }}
        icon={<TokenIcon fontSize="small" />}
        label={t('ai.dashboard.kpiTokens')}
        value={tokens(d.total_tokens)}
        hint={t('ai.dashboard.kpiTokensHint', {
          vars: { input: tokens(d.prompt_tokens), output: tokens(d.completion_tokens) },
        })}
      />
    ),
    kpi(
      'failures',
      9,
      <StatCard
        sx={{ height: '100%' }}
        icon={<ErrorOutlineIcon fontSize="small" />}
        label={t('ai.dashboard.kpiFailures')}
        value={failed.toLocaleString()}
        hint={t('ai.dashboard.kpiFailuresHint', {
          vars: { failed: d.failed_calls, skipped: d.skipped_calls },
        })}
      />
    ),
    {
      id: 'by-task',
      title: t('ai.dashboard.costPerTask'),
      disablePadding: true,
      defaultLayout: { x: 0, y: 2, w: 12, h: 8 },
      minW: 4,
      minH: 4,
      content: <TaskSpendTable rows={d.by_task} />,
    },
    {
      id: 'by-module',
      title: t('ai.dashboard.byArea'),
      fitContent: true,
      defaultLayout: { x: 0, y: 10, w: 4, h: 5 },
      minW: 3,
      minH: 2,
      content: <SpendBars rows={bucketRows(d.by_module)} emptyText={noCalls} />,
    },
    {
      id: 'by-model',
      title: t('ai.dashboard.byModel'),
      fitContent: true,
      defaultLayout: { x: 4, y: 10, w: 4, h: 5 },
      minW: 3,
      minH: 2,
      content: <SpendBars rows={bucketRows(d.by_model)} emptyText={noCalls} />,
    },
    {
      id: 'rates',
      title: t('ai.dashboard.modelRates'),
      fitContent: true,
      defaultLayout: { x: 8, y: 10, w: 4, h: 5 },
      minW: 3,
      minH: 2,
      content: <RateCardList prices={d.prices} onEdit={onEditRate} />,
    },
    {
      id: 'trend',
      title: t('ai.dashboard.dailySpend'),
      fitContent: true,
      defaultLayout: { x: 0, y: 15, w: 12, h: 6 },
      minW: 4,
      minH: 3,
      content: <SpendBars rows={trend} emptyText={noCalls} />,
    },
  ];
}
