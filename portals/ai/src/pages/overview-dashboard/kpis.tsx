import type { ReactNode } from 'react';
import { StatCard } from '@duncit/ui';
import type { DashboardWidget } from '@duncit/dashboard';
import type { useTranslation } from '@duncit/shell';
import PaymentsIcon from '@mui/icons-material/Payments';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import TokenIcon from '@mui/icons-material/Token';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import SpeedIcon from '@mui/icons-material/Speed';
import GroupIcon from '@mui/icons-material/Group';
import TuneIcon from '@mui/icons-material/Tune';
import ShieldIcon from '@mui/icons-material/Shield';
import HubIcon from '@mui/icons-material/Hub';
import { tokens, usd } from '../../lib/usd';
import { millis, percent } from '../../components/charts/summaries';
import { changeColor, changeHint, pointsHint, type Better } from './change';
import type { OverviewDashboard } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

interface Tile {
  id: string;
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  hintColor?: string;
  /** The page with the detail behind the tile. */
  to?: string;
}

const tileWidget = (tile: Tile, layout: DashboardWidget['defaultLayout']): DashboardWidget => ({
  id: tile.id,
  bare: true,
  defaultLayout: layout,
  minW: 2,
  minH: 2,
  content: (
    <StatCard
      sx={{ height: '100%' }}
      testId={`kpi-${tile.id}`}
      icon={tile.icon}
      label={tile.label}
      value={tile.value}
      hint={tile.hint}
      hintColor={tile.hintColor}
      to={tile.to}
    />
  ),
});

/** A headline figure with its change against the previous period. */
const trend = (
  id: string,
  icon: ReactNode,
  label: string,
  value: string,
  change: { hint: string; value: number | null; better: Better }
): Tile => ({ id, icon, label, value, hint: change.hint, hintColor: changeColor(change.value, change.better) });

/** The headline row: cost, calls, tokens, error rate, speed and people, each against the previous period. */
export function kpiWidgets(d: OverviewDashboard, t: Translate): DashboardWidget[] {
  const { totals, change } = d;
  const tiles: Tile[] = [
    trend('cost', <PaymentsIcon fontSize="small" />, t('ai.overview.kpiCost'), usd(totals.cost_usd), {
      hint: changeHint(t, change.cost_usd),
      value: change.cost_usd,
      better: 'neither',
    }),
    trend('calls', <SmartToyIcon fontSize="small" />, t('ai.overview.kpiCalls'), tokens(totals.calls), {
      hint: changeHint(t, change.calls),
      value: change.calls,
      better: 'neither',
    }),
    trend('tokens', <TokenIcon fontSize="small" />, t('ai.overview.kpiTokens'), tokens(totals.total_tokens), {
      hint: changeHint(t, change.total_tokens),
      value: change.total_tokens,
      better: 'neither',
    }),
    trend('error-rate', <ErrorOutlineIcon fontSize="small" />, t('ai.overview.kpiErrorRate'), percent(t)(totals.error_rate), {
      hint: pointsHint(t, change.error_rate_points),
      value: change.error_rate_points,
      better: 'down',
    }),
    trend('latency', <SpeedIcon fontSize="small" />, t('ai.overview.kpiLatency'), millis(t)(totals.avg_duration_ms), {
      hint: changeHint(t, change.avg_duration_ms),
      value: change.avg_duration_ms,
      better: 'down',
    }),
    trend('users', <GroupIcon fontSize="small" />, t('ai.overview.kpiUsers'), tokens(totals.active_users), {
      hint: changeHint(t, change.active_users),
      value: change.active_users,
      better: 'up',
    }),
  ];
  return tiles.map((tile, index) => tileWidget(tile, { x: index * 2, y: 0, w: 2, h: 2 }));
}

/** The second row: the rest of the portal — feature switches, image checks and automations. */
export function summaryWidgets(d: OverviewDashboard, t: Translate): DashboardWidget[] {
  const { monitoring, automation } = d;
  const tiles: Tile[] = [
    {
      id: 'features',
      icon: <TuneIcon fontSize="small" />,
      label: t('ai.overview.kpiFeatures'),
      value: t('ai.overview.kpiFeaturesValue', { vars: { enabled: d.features_enabled, total: d.features_total } }),
      hint: t('ai.overview.kpiFeaturesHint', { vars: { used: d.by_feature.length } }),
      to: `/ai-features?days=${d.range_days}`,
    },
    {
      id: 'scans',
      icon: <ShieldIcon fontSize="small" />,
      label: t('ai.overview.kpiScans'),
      value: tokens(monitoring.scanned),
      hint: t('ai.overview.kpiScansHint', {
        vars: { flagged: monitoring.flagged, blocked: monitoring.blocked, failed: monitoring.failed },
      }),
      to: '/monitoring',
    },
    {
      id: 'runs',
      icon: <HubIcon fontSize="small" />,
      label: t('ai.overview.kpiRuns'),
      value: tokens(automation.runs),
      hint: t('ai.overview.kpiRunsHint', {
        vars: { failed: automation.failed, active: automation.active_flows, total: automation.total_flows },
      }),
      to: '/automation/whatsapp',
    },
  ];
  return tiles.map((tile, index) => tileWidget(tile, { x: index * 4, y: 2, w: 4, h: 2 }));
}
