import { useMemo } from 'react';
import { Box, Link, Typography } from '@mui/material';
import { DuncitTable, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { COLUMN_COPY, LEADERBOARD_COPY } from './copy';
import { formatValue } from './format';
import type { AnalyticsLeaderboard } from './queries';

type LeaderRow = AnalyticsLeaderboard['rows'][number] & { rank: number };

const getRowId = (row: LeaderRow) => row.id;
const searchOf = (row: LeaderRow) => `${row.name} ${row.caption ?? ''}`;

/** A row with a record page of its own (a club, a host) opens it in a new tab. */
function RowName({ row }: Readonly<{ row: LeaderRow }>) {
  if (!row.url) return <>{row.name}</>;
  return (
    <Link href={row.url} target="_blank" rel="noopener noreferrer" underline="hover" color="inherit">
      {row.name}
    </Link>
  );
}

const renderName = (row: LeaderRow) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography variant="body2" noWrap title={row.name} sx={{ fontWeight: 600 }}>
      <RowName row={row} />
    </Typography>
    {row.caption && (
      <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
        {row.caption}
      </Typography>
    )}
  </Box>
);

/**
 * The period's top ten, as a short ranking — the one table on an Analytics
 * page. It is a summary, not a list to work through: the full records live in
 * the Clubs, Club Admins and Hosts consoles. The widget around it carries the title.
 */
export default function LeaderboardTable({ leaderboard }: Readonly<{ leaderboard: AnalyticsLeaderboard }>) {
  const { t } = useTranslation();
  const copy = LEADERBOARD_COPY[leaderboard.key];
  const rows = useMemo<LeaderRow[]>(
    () => leaderboard.rows.map((row, index) => ({ ...row, rank: index + 1 })),
    [leaderboard.rows]
  );

  const columns = useMemo<DuncitColumn<LeaderRow>[]>(
    () => [
      { field: 'rank', headerName: '#', width: 70, type: 'number', valueGetter: (row) => row.rank },
      {
        field: 'name',
        headerName: copy ? t(copy.name) : '',
        flex: 1,
        minWidth: 200,
        type: 'text',
        cellRenderer: renderName,
        valueGetter: (row) => row.name,
      },
      ...leaderboard.columns.map<DuncitColumn<LeaderRow>>((column, index) => ({
        field: `values.${index}`,
        headerName: t(COLUMN_COPY[column.key] ?? column.key),
        width: 130,
        type: 'number',
        valueGetter: (row) => formatValue(row.values[index], column.format),
      })),
    ],
    [leaderboard.columns, copy, t]
  );
  const fetchRows = useMemo(() => clientTableFetch<LeaderRow>(rows, searchOf, columns), [rows, columns]);

  return (
    <DuncitTable<LeaderRow>
      tableId={`analytics-${leaderboard.key}`}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t(copy?.empty ?? 'analytics.leaderboard.empty')}
      defaultSort={{ field: 'rank', dir: 'asc' }}
      searchPlaceholder={t('analytics.leaderboard.search')}
    />
  );
}
