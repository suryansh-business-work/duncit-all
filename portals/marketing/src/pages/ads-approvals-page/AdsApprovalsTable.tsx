import { useMemo, type MutableRefObject } from 'react';
import { DuncitTable, type TableFetch } from '@duncit/table';
import { getAdColumns } from './columns';
import type { AdRequestRow } from './helpers';

interface Props {
  fetchRows: TableFetch<AdRequestRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onReview: (row: AdRequestRow) => void;
}

const getAdRowId = (row: AdRequestRow) => row.id;

export default function AdsApprovalsTable({ fetchRows, refetchRef, onReview }: Readonly<Props>) {
  const columns = useMemo(() => getAdColumns({ onReview }), [onReview]);

  return (
    <DuncitTable<AdRequestRow>
      tableId="marketing-ads-approvals"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getAdRowId}
      onRowClick={onReview}
      emptyText="No ad requests match the current filters."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search trace ID or ad title"
      refetchRef={refetchRef}
    />
  );
}
