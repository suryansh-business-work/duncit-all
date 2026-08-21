import { useMemo, type MutableRefObject } from 'react';
import { DuncitTable, type TableFetch } from '@duncit/table';
import { getApprovalColumns } from './columns';
import type { ApprovalRequest } from './helpers';
import { useTranslation } from '@duncit/shell';

interface Props {
  fetchRows: TableFetch<ApprovalRequest>;
  refetchRef: MutableRefObject<(() => void) | null>;
  formatDateTime: (s: string) => string;
  onReview: (row: ApprovalRequest) => void;
}

const getApprovalRowId = (row: ApprovalRequest) => row.id;

export default function ApprovalsTable({ fetchRows, refetchRef, formatDateTime, onReview }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo(
    () => getApprovalColumns({ formatDateTime, onReview, t }),
    [formatDateTime, onReview]
  );

  return (
    <DuncitTable<ApprovalRequest>
      tableId="admin-approvals"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getApprovalRowId}
      onRowClick={onReview}
      emptyText={t('admin.approvals.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search subject, title or requester"
      refetchRef={refetchRef}
    />
  );
}
