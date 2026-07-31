import { useMemo, type MutableRefObject } from 'react';
import { DuncitTable, type TableFetch } from '@duncit/table';
import { getAudienceColumns, type AudienceColumnDeps } from './columns';
import type { AudienceRow } from './helpers';

interface Props {
  fetchRows: TableFetch<AudienceRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  /** Memoized by the page — the filter dropdown values plus the date format. */
  columnDeps: AudienceColumnDeps;
}

const getRowId = (row: AudienceRow) => row.id;

export default function AudienceTable({ fetchRows, refetchRef, columnDeps }: Readonly<Props>) {
  const columns = useMemo(() => getAudienceColumns(columnDeps), [columnDeps]);

  return (
    <DuncitTable<AudienceRow>
      tableId="marketing-target-audience"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      refetchRef={refetchRef}
      emptyText="No one matches these filters."
      searchPlaceholder="Search by name, email or phone"
      defaultSort={{ field: 'created_at', dir: 'desc' }}
    />
  );
}
