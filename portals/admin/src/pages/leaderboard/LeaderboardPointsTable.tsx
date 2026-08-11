import { useMemo } from 'react';
import { DuncitTable, type TableFetch } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { buildLeaderboardPointsColumns } from './leaderboardPointsColumns';
import type { LeaderboardPointRow } from './queries';

interface Props {
  fetchRows: TableFetch<LeaderboardPointRow>;
}

const getPointRowId = (row: LeaderboardPointRow) => row.id;

export default function LeaderboardPointsTable({ fetchRows }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();

  // Memoised: DuncitTable rebuilds its AG Grid column defs whenever this array
  // changes identity, which would drop the admin's column widths every render.
  const columns = useMemo(
    () => buildLeaderboardPointsColumns(t, formatDateTime),
    [t, formatDateTime],
  );

  return (
    <DuncitTable<LeaderboardPointRow>
      tableId="admin-leaderboard-points"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getPointRowId}
      emptyText={t('admin.leaderboard.boardEmpty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      defaultPageSize={10}
    />
  );
}
