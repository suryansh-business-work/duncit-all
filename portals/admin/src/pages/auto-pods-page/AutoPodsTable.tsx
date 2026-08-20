import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { DuncitTable, type TableFetch } from '@duncit/table';
import type { AutoPodLabels } from '@duncit/utils';
import { getAutoPodColumns } from './columns';
import type { AutoPodTableRow } from './queries';

interface Props {
  t: (key: string) => string;
  labels: AutoPodLabels;
  fetchRows: TableFetch<AutoPodTableRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  formatDateTime: (value: string) => string;
  toolbarActions?: ReactNode;
  onEdit: (row: AutoPodTableRow) => void;
  onCancel: (row: AutoPodTableRow) => void;
  onViewPod: (row: AutoPodTableRow) => void;
}

const getRowId = (row: AutoPodTableRow) => row.id;

export default function AutoPodsTable({
  t,
  labels,
  fetchRows,
  refetchRef,
  formatDateTime,
  toolbarActions,
  onEdit,
  onCancel,
  onViewPod,
}: Readonly<Props>) {
  const columns = useMemo(
    () => getAutoPodColumns({ t, labels, formatDateTime, onEdit, onCancel, onViewPod }),
    [t, labels, formatDateTime, onEdit, onCancel, onViewPod]
  );

  return (
    <DuncitTable<AutoPodTableRow>
      tableId="admin-auto-pods"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      toolbarActions={toolbarActions}
      emptyText={t('admin.autoPods.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      refetchRef={refetchRef}
    />
  );
}
