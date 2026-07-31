import { useMemo, type MutableRefObject } from 'react';
import { DuncitTable, type TableFetch } from '@duncit/table';
import { getLiveAdColumns } from './columns';
import type { AdRequestRow } from '../ads-approvals-page/helpers';

interface Props {
  fetchRows: TableFetch<AdRequestRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  formatDate: (date: Date) => string;
  onOpen: (row: AdRequestRow) => void;
  onStop: (row: AdRequestRow) => void;
  onDelete: (row: AdRequestRow) => void;
}

const getRowId = (row: AdRequestRow) => row.id;

export default function LiveAdsTable({
  fetchRows,
  refetchRef,
  formatDate,
  onOpen,
  onStop,
  onDelete,
}: Readonly<Props>) {
  const columns = useMemo(
    () => getLiveAdColumns({ formatDate, onStop, onDelete }),
    [formatDate, onStop, onDelete],
  );

  return (
    <DuncitTable<AdRequestRow>
      tableId="marketing-live-ads"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onOpen}
      refetchRef={refetchRef}
      emptyText="No ads are running right now."
      defaultSort={{ field: 'end_at', dir: 'asc' }}
      searchPlaceholder="Search trace ID or ad title"
    />
  );
}
