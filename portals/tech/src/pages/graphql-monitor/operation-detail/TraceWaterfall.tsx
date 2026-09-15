import { useMemo } from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { formatMs } from '../../stress-testing/labels';
import type { ResolverTiming } from '../queries';

interface Props {
  resolvers: readonly ResolverTiming[];
  durationMs: number;
  resolverCount: number;
}

/** A trace can time thousands of trivial fields; the slowest this many tell the story. */
const MAX_ROWS = 200;

const depthOf = (path: string) => path.split('.').filter((segment) => !/^\d+$/.test(segment)).length - 1;

/** The rows worth drawing: the slowest resolvers, back in the order they started. */
function visibleRows(resolvers: readonly ResolverTiming[]): ResolverTiming[] {
  const slowest = [...resolvers];
  slowest.sort((a, b) => b.duration_ms - a.duration_ms);
  const kept = slowest.slice(0, MAX_ROWS);
  kept.sort((a, b) => a.start_ms - b.start_ms);
  return kept;
}

function ResolverRow({ row, scale }: Readonly<{ row: ResolverTiming; scale: number }>) {
  const left = Math.min(100, row.start_ms * scale);
  const width = Math.max(0.4, Math.min(100 - left, row.duration_ms * scale));
  return (
    <Box
      data-testid={`graphql-monitor-trace-row-${row.path}`}
      sx={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 40%) 1fr 70px', gap: 1, alignItems: 'center', py: 0.25 }}
    >
      <Tooltip title={`${row.parent_type}.${row.field_name}: ${row.return_type}`}>
        <Typography variant="caption" noWrap sx={{ fontFamily: 'monospace', pl: depthOf(row.path) * 1.5, color: row.error ? 'error.main' : undefined }}>
          {row.path}
        </Typography>
      </Tooltip>
      <Box sx={{ position: 'relative', height: 10, bgcolor: 'action.hover', borderRadius: 0.5 }}>
        <Box
          sx={{
            position: 'absolute',
            left: `${left}%`,
            width: `${width}%`,
            top: 0,
            bottom: 0,
            borderRadius: 0.5,
            bgcolor: row.error ? 'error.main' : 'primary.main',
          }}
        />
      </Box>
      <Typography variant="caption" sx={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {formatMs(row.duration_ms)}
      </Typography>
    </Box>
  );
}

/** Each resolver on the request's own timeline — where a slow operation spends its time. */
export default function TraceWaterfall({ resolvers, durationMs, resolverCount }: Readonly<Props>) {
  const { t } = useTranslation();
  const rows = useMemo(() => visibleRows(resolvers), [resolvers]);
  const scale = 100 / Math.max(durationMs, 1);

  if (rows.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('tech.graphqlMonitor.traceNoResolvers')}
      </Typography>
    );
  }
  return (
    <Stack spacing={1} data-testid="graphql-monitor-trace-waterfall">
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('tech.graphqlMonitor.traceShowing', { vars: { shown: rows.length, total: resolverCount } })}
      </Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ minWidth: 560 }}>
          {rows.map((row) => (
            <ResolverRow key={`${row.path}|${row.start_ms}`} row={row} scale={scale} />
          ))}
        </Box>
      </Box>
    </Stack>
  );
}
