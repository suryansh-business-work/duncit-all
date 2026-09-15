import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { formatCount, formatMs, formatPct } from '../../stress-testing/labels';
import TopOperationsCard from './TopOperationsCard';
import type { OperationSummary } from '../queries';

interface Props {
  operations: readonly OperationSummary[];
  onOpen: (operation: OperationSummary) => void;
}

const TOP = 5;

function topBy(operations: readonly OperationSummary[], pick: (op: OperationSummary) => number): OperationSummary[] {
  const ranked = operations.filter((op) => pick(op) > 0);
  ranked.sort((a, b) => pick(b) - pick(a));
  return ranked.slice(0, TOP);
}

/** The three lists GraphOS leads with: slowest, busiest, and failing most. */
export default function TopOperations({ operations, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const lists = useMemo(
    () => ({
      slowest: topBy(operations, (op) => op.p95_ms),
      busiest: topBy(operations, (op) => op.requests),
      failing: topBy(operations, (op) => op.errors),
    }),
    [operations]
  );

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' } }}>
      <TopOperationsCard
        title={t('tech.graphqlMonitor.topSlowest')}
        subtitle={t('tech.graphqlMonitor.topSlowestHint')}
        emptyText={t('tech.graphqlMonitor.topEmpty')}
        operations={lists.slowest}
        metric={(op) => formatMs(op.p95_ms)}
        onOpen={onOpen}
        testId="graphql-monitor-top-slowest"
      />
      <TopOperationsCard
        title={t('tech.graphqlMonitor.topBusiest')}
        subtitle={t('tech.graphqlMonitor.topBusiestHint')}
        emptyText={t('tech.graphqlMonitor.topEmpty')}
        operations={lists.busiest}
        metric={(op) => formatCount(op.requests)}
        onOpen={onOpen}
        testId="graphql-monitor-top-busiest"
      />
      <TopOperationsCard
        title={t('tech.graphqlMonitor.topFailing')}
        subtitle={t('tech.graphqlMonitor.topFailingHint')}
        emptyText={t('tech.graphqlMonitor.topFailingEmpty')}
        operations={lists.failing}
        metric={(op) => formatPct(op.error_rate_pct)}
        onOpen={onOpen}
        testId="graphql-monitor-top-failing"
      />
    </Box>
  );
}
