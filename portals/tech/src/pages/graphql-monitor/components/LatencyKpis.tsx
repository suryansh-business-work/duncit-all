import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import MetricTiles, { type MetricTile } from '../../stress-testing/components/MetricTiles';
import { formatCount, formatMs, formatPct } from '../../stress-testing/labels';
import { formatDateTime } from '../../server/format';
import { errorRateColor, latencyColor } from '../labels';
import type { LatencyNumbers } from '../queries';

interface Props {
  numbers: LatencyNumbers;
  slowMs: number | null;
  testId: string;
  /** Tiles a page adds in front, e.g. the operation count on the overview. */
  leading?: readonly MetricTile[];
}

const slowColor = (ms: number, slowMs: number | null) => (slowMs === null ? undefined : latencyColor(ms, slowMs));

/** One shared empty list, so the memo below is not invalidated by a fresh `[]` each render. */
const NO_TILES: readonly MetricTile[] = [];

/** Requests, error rate and the latency percentiles — the strip every monitor view opens with. */
export default function LatencyKpis({ numbers, slowMs, testId, leading = NO_TILES }: Readonly<Props>) {
  const { t } = useTranslation();
  const tiles = useMemo<MetricTile[]>(
    () => [
      ...leading,
      {
        id: 'requests',
        label: t('tech.graphqlMonitor.kpiRequests'),
        value: formatCount(numbers.requests),
        hint: t('tech.graphqlMonitor.kpiRpm', { vars: { rpm: numbers.rpm } }),
      },
      {
        id: 'error-rate',
        label: t('tech.graphqlMonitor.kpiErrorRate'),
        value: formatPct(numbers.error_rate_pct),
        hint: t('tech.graphqlMonitor.kpiErrorsHint', { vars: { total: formatCount(numbers.errors) } }),
        valueColor: errorRateColor(numbers.error_rate_pct),
      },
      { id: 'p50', label: t('tech.graphqlMonitor.kpiP50'), value: formatMs(numbers.p50_ms) },
      {
        id: 'p95',
        label: t('tech.graphqlMonitor.kpiP95'),
        value: formatMs(numbers.p95_ms),
        valueColor: slowColor(numbers.p95_ms, slowMs),
      },
      {
        id: 'p99',
        label: t('tech.graphqlMonitor.kpiP99'),
        value: formatMs(numbers.p99_ms),
        hint: t('tech.graphqlMonitor.kpiMaxHint', { vars: { max: formatMs(numbers.max_ms) } }),
      },
      { id: 'avg', label: t('tech.graphqlMonitor.kpiAvg'), value: formatMs(numbers.avg_ms) },
      {
        id: 'cached',
        label: t('tech.graphqlMonitor.kpiCached'),
        value: formatCount(numbers.cached),
        hint: t('tech.graphqlMonitor.kpiCachedHint'),
      },
      {
        id: 'last-seen',
        label: t('tech.graphqlMonitor.kpiLastSeen'),
        value: formatDateTime(numbers.last_seen_at),
      },
    ],
    [leading, numbers, slowMs, t]
  );

  return (
    <Box data-testid={`${testId}-kpis`}>
      <MetricTiles tiles={tiles} />
    </Box>
  );
}
