import { Grid } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { StatCard } from '@duncit/ui';
import { formatCost, formatCount } from '../../lib/format';
import type { UsageTotals } from './queries';

interface KpiTilesProps {
  totals: UsageTotals | undefined;
  /** The currency the costs were priced in. */
  currency: string;
  loading: boolean;
}

/** The window's headline numbers: volume, failures, people, tokens, cost and speed. */
export default function KpiTiles({ totals, currency, loading }: Readonly<KpiTilesProps>) {
  const { t, locale } = useTranslation();
  const count = (value: number | undefined) => formatCount(value ?? 0, locale);
  const tiles = [
    { key: 'calls', label: t('mcp.dashboard.kpiCalls'), value: count(totals?.calls) },
    { key: 'errors', label: t('mcp.dashboard.kpiErrors'), value: count(totals?.errors) },
    { key: 'blocked', label: t('mcp.dashboard.kpiBlocked'), value: count(totals?.blocked) },
    { key: 'users', label: t('mcp.dashboard.kpiUsers'), value: count(totals?.users) },
    { key: 'input', label: t('mcp.dashboard.kpiInputTokens'), value: count(totals?.input_tokens) },
    { key: 'output', label: t('mcp.dashboard.kpiOutputTokens'), value: count(totals?.output_tokens) },
    {
      key: 'cost',
      label: t('mcp.dashboard.kpiCost'),
      value: currency ? formatCost(totals?.cost ?? 0, currency, locale) : count(totals?.cost),
      hint: t('mcp.dashboard.kpiCostHint'),
    },
    {
      key: 'latency',
      label: t('mcp.dashboard.kpiLatency'),
      value: t('mcp.common.milliseconds', { vars: { ms: count(totals?.avg_ms) } }),
    },
  ];
  return (
    <Grid container spacing={2}>
      {tiles.map((tile) => (
        <Grid key={tile.key} size={{ xs: 6, md: 3 }}>
          <StatCard label={tile.label} value={tile.value} hint={tile.hint} loading={loading} testId={`mcp-kpi-${tile.key}`} />
        </Grid>
      ))}
    </Grid>
  );
}
