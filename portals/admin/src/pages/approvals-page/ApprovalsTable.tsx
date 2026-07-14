import { useMemo, type MutableRefObject } from 'react';
import { DuncitTable, type TableFetch } from '@duncit/table';
import { getApprovalColumns } from './columns';
import type { ApprovalRequest } from './helpers';

interface Props {
  fetchRows: TableFetch<ApprovalRequest>;
  refetchRef: MutableRefObject<(() => void) | null>;
  formatDateTime: (s: string) => string;
  onReview: (row: ApprovalRequest) => void;
}

const getApprovalRowId = (row: ApprovalRequest) => row.id;

export default function ApprovalsTable({ fetchRows, refetchRef, formatDateTime, onReview }: Readonly<Props>) {
  const columns = useMemo(
    () => getApprovalColumns({ formatDateTime, onReview }),
    [formatDateTime, onReview]
  );

  return (
    <DuncitTable<ApprovalRequest>
      tableId="admin-approvals"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getApprovalRowId}
      onRowClick={onReview}
      emptyText="No approval requests match the current filters."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search subject, title or requester"
      refetchRef={refetchRef}
    />
  );
}
