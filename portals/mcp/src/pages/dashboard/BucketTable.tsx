import { useCallback, useMemo } from 'react';
import { Typography } from '@mui/material';
import { dateColumn, DuncitTable, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import { formatCost, formatCount } from '../../lib/format';
import { useClientRows } from '../../lib/useClientRows';
import type { UsageBucket } from './queries';

interface BucketTableProps {
  tableId: string;
  title: string;
  /** The heading of the first column — what one row is: a tool, an app, a person. */
  keyHeader: string;
  rows: readonly UsageBucket[];
  currency: string;
  /** How a row's key reads — a status in the reader's language, say. Defaults to the key. */
  labelOf?: (key: string) => string;
}

/** The key the server gives a bucket whose value was missing (no email, no app name). */
const UNKNOWN_KEY = 'unknown';
const getRowId = (row: UsageBucket) => row.key;
type CountField = 'calls' | 'errors' | 'blocked' | 'input_tokens' | 'output_tokens';

/** One breakdown of the window — calls, failures, tokens, cost and speed per tool, app, person… */
export default function BucketTable({ tableId, title, keyHeader, rows, currency, labelOf }: Readonly<BucketTableProps>) {
  const { t, locale } = useTranslation();
  const label = useCallback(
    (key: string) => (key === UNKNOWN_KEY ? t('mcp.common.unknown') : (labelOf?.(key) ?? key)),
    [t, labelOf],
  );
  const columns = useMemo<DuncitColumn<UsageBucket>[]>(() => {
    const count = (value: number) => formatCount(value, locale);
    const counted = (field: CountField, headerKey: string, hide = false): DuncitColumn<UsageBucket> => ({
      field,
      headerName: t(headerKey),
      type: 'number',
      width: 110,
      hide,
      valueGetter: (row) => count(row[field]),
    });
    return [
      { field: 'key', headerName: keyHeader, type: 'text', flex: 2, minWidth: 180, valueGetter: (row) => label(row.key) },
      counted('calls', 'mcp.dashboard.columnCalls'),
      counted('errors', 'mcp.dashboard.columnErrors'),
      counted('blocked', 'mcp.dashboard.columnBlocked'),
      counted('input_tokens', 'mcp.dashboard.columnTokensIn', true),
      counted('output_tokens', 'mcp.dashboard.columnTokensOut', true),
      {
        field: 'cost',
        headerName: t('mcp.dashboard.columnCost'),
        type: 'number',
        width: 120,
        valueGetter: (row) => (currency ? formatCost(row.cost, currency, locale) : count(row.cost)),
      },
      {
        field: 'avg_ms',
        headerName: t('mcp.dashboard.columnAvgMs'),
        type: 'number',
        width: 120,
        valueGetter: (row) => t('mcp.common.milliseconds', { vars: { ms: count(row.avg_ms) } }),
      },
      dateColumn<UsageBucket>({ field: 'last_at', headerName: t('mcp.dashboard.columnLastAt') }),
    ];
  }, [t, locale, keyHeader, currency, label]);
  const searchOf = useCallback((row: UsageBucket) => label(row.key), [label]);
  const { fetchRows, refetchRef } = useClientRows(rows, searchOf, columns);

  return (
    <SectionCard title={title}>
      {rows.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('mcp.dashboard.bucketEmpty')}
        </Typography>
      ) : (
        <DuncitTable<UsageBucket>
          tableId={tableId}
          ariaLabel={title}
          columns={columns}
          fetchRows={fetchRows}
          getRowId={getRowId}
          refetchRef={refetchRef}
          defaultSort={{ field: 'calls', dir: 'desc' }}
          defaultPageSize={10}
        />
      )}
    </SectionCard>
  );
}
