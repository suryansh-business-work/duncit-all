import { StatCard } from '@duncit/ui';
import type { DashboardWidget } from '@duncit/dashboard';
import type { useTranslation } from '@duncit/shell';
import PaymentsIcon from '@mui/icons-material/Payments';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import TokenIcon from '@mui/icons-material/Token';
import SpeedIcon from '@mui/icons-material/Speed';
import TuneIcon from '@mui/icons-material/Tune';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import { tokens, usd } from '../../lib/usd';
import { millis } from '../../components/charts/summaries';
import { answeredRate, costPerCall } from './rankings';
import type { FeaturesDashboard } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

const kpi = (id: string, x: number, content: DashboardWidget['content']): DashboardWidget => ({
  id,
  bare: true,
  defaultLayout: { x, y: 0, w: 2, h: 2 },
  minW: 2,
  minH: 2,
  content,
});

/** The headline tiles: what AI cost, how much it ran, how fast, and how reliably. */
export function kpiWidgets(d: FeaturesDashboard, t: Translate): DashboardWidget[] {
  return [
    kpi(
      'cost',
      0,
      <StatCard
        sx={{ height: '100%' }}
        icon={<PaymentsIcon fontSize="small" />}
        label={t('ai.featuresDashboard.kpiCost')}
        value={usd(d.cost_usd)}
        hint={t('ai.featuresDashboard.kpiCostHint', { vars: { amount: usd(costPerCall(d)) } })}
      />
    ),
    kpi(
      'calls',
      2,
      <StatCard
        sx={{ height: '100%' }}
        icon={<SmartToyIcon fontSize="small" />}
        label={t('ai.featuresDashboard.kpiCalls')}
        value={tokens(d.calls)}
        hint={t('ai.featuresDashboard.kpiCallsHint', { vars: { rate: answeredRate(d) } })}
      />
    ),
    kpi(
      'tokens',
      4,
      <StatCard
        sx={{ height: '100%' }}
        icon={<TokenIcon fontSize="small" />}
        label={t('ai.featuresDashboard.kpiTokens')}
        value={tokens(d.total_tokens)}
        hint={t('ai.featuresDashboard.kpiTokensHint', {
          vars: { input: tokens(d.prompt_tokens), output: tokens(d.completion_tokens) },
        })}
      />
    ),
    kpi(
      'latency',
      6,
      <StatCard
        sx={{ height: '100%' }}
        icon={<SpeedIcon fontSize="small" />}
        label={t('ai.featuresDashboard.kpiLatency')}
        value={millis(t)(d.avg_duration_ms)}
        hint={t('ai.featuresDashboard.kpiLatencyHint')}
      />
    ),
    kpi(
      'features',
      8,
      <StatCard
        sx={{ height: '100%' }}
        icon={<TuneIcon fontSize="small" />}
        label={t('ai.featuresDashboard.kpiFeatures')}
        value={t('ai.featuresDashboard.kpiFeaturesValue', {
          vars: { used: d.features_used, total: d.features_total },
        })}
        hint={t('ai.featuresDashboard.kpiFeaturesHint', {
          vars: { off: d.features_total - d.features_enabled },
        })}
      />
    ),
    kpi(
      'failures',
      10,
      <StatCard
        sx={{ height: '100%' }}
        icon={<ErrorOutlineIcon fontSize="small" />}
        label={t('ai.featuresDashboard.kpiFailures')}
        value={tokens(d.failed_calls + d.skipped_calls)}
        hint={t('ai.featuresDashboard.kpiFailuresHint', {
          vars: { failed: d.failed_calls, skipped: d.skipped_calls },
        })}
      />
    ),
  ];
}
