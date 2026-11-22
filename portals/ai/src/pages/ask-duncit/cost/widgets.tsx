import { StatCard } from '@duncit/ui';
import type { DashboardWidget } from '@duncit/dashboard';
import type { useTranslation } from '@duncit/shell';
import PaymentsIcon from '@mui/icons-material/Payments';
import TokenIcon from '@mui/icons-material/Token';
import TrendChart from '../../../components/charts/TrendChart';
import { rankWidget } from '../../../components/charts/rankWidget';
import { rankBy } from '../../../components/charts/ranking';
import { trendSummary } from '../../../components/charts/summaries';
import { tokens, usd } from '../../../lib/usd';

type Translate = ReturnType<typeof useTranslation>['t'];

interface SpendRow {
  key: string | null;
  tokens: number;
  cost: number;
  calls?: number;
}

export interface AskDuncitCost {
  days: number;
  total_cost_usd: number;
  total_tokens: number;
  by_task: SpendRow[];
  by_model: SpendRow[];
  by_day: Array<{ date: string; calls: number; tokens: number; cost: number }>;
  by_role: SpendRow[];
  unpriced_models: string[];
}

/** Spend over the range — every Ask Duncit call priced in OpenAI Logs, chat, evaluator, memory and voice alike. */
export function buildCostWidgets(c: AskDuncitCost, t: Translate, formatDay: (day: string) => string): DashboardWidget[] {
  const days = c.by_day.map((day) => day.date);
  const title = t('ai.askDuncit.cost.daily');
  const none = t('ai.askDuncit.noData');
  const label = (row: SpendRow) => row.key || t('ai.askDuncit.unknown');
  return [
    { id: 'total', bare: true, defaultLayout: { x: 0, y: 0, w: 3, h: 2 }, minW: 2, minH: 2, content: <StatCard sx={{ height: '100%' }} icon={<PaymentsIcon fontSize="small" />} label={t('ai.askDuncit.kpi.cost')} value={usd(c.total_cost_usd)} /> },
    { id: 'tokens', bare: true, defaultLayout: { x: 3, y: 0, w: 3, h: 2 }, minW: 2, minH: 2, content: <StatCard sx={{ height: '100%' }} icon={<TokenIcon fontSize="small" />} label={t('ai.askDuncit.kpi.tokens')} value={tokens(c.total_tokens)} /> },
    {
      id: 'daily',
      title,
      defaultLayout: { x: 0, y: 2, w: 12, h: 6 },
      minW: 4,
      minH: 4,
      content: <TrendChart type="line" days={days} series={[{ label: t('ai.askDuncit.kpi.cost'), data: c.by_day.map((day) => day.cost) }]} format={usd} summary={trendSummary(t, title, days, usd(c.total_cost_usd), formatDay)} />,
    },
    rankWidget(t, { id: 'task', title: t('ai.askDuncit.cost.byTask'), ranking: rankBy(c.by_task, label, (r) => r.cost), seriesLabel: t('ai.askDuncit.kpi.cost'), format: usd, emptyText: none, layout: { x: 0, y: 8, w: 4, h: 6 } }),
    rankWidget(t, { id: 'model', title: t('ai.askDuncit.cost.byModel'), ranking: rankBy(c.by_model, label, (r) => r.cost), seriesLabel: t('ai.askDuncit.kpi.cost'), format: usd, emptyText: none, layout: { x: 4, y: 8, w: 4, h: 6 } }),
    rankWidget(t, { id: 'role', title: t('ai.askDuncit.cost.byRole'), ranking: rankBy(c.by_role, label, (r) => r.cost), seriesLabel: t('ai.askDuncit.kpi.cost'), format: usd, emptyText: none, layout: { x: 8, y: 8, w: 4, h: 6 } }),
  ];
}
