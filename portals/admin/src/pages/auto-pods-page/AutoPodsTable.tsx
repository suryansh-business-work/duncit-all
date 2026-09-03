import { useMemo, useState, type MutableRefObject, type ReactNode } from 'react';
import { DuncitTable, type TableFetch, type TableFilterValue } from '@duncit/table';
import type { AutoPodLabels, AutoPodRole } from '@duncit/utils';
import AutoPodEnrolledDialog from './enrolled/AutoPodEnrolledDialog';
import { getAutoPodColumns } from './columns';
import type { AutoPodTableRow } from './queries';

interface Props {
  t: (key: string) => string;
  labels: AutoPodLabels;
  fetchRows: TableFetch<AutoPodTableRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  formatDateTime: (value: string) => string;
  toolbarActions?: ReactNode;
  /** The page-level status filter; a change resets to page 1. */
  externalFilters?: readonly TableFilterValue[];
  onRowClick: (row: AutoPodTableRow) => void;
  onViewDetails: (row: AutoPodTableRow) => void;
  onEdit: (row: AutoPodTableRow) => void;
  onCancel: (row: AutoPodTableRow) => void;
  onDelete: (row: AutoPodTableRow) => void;
  onViewPod: (row: AutoPodTableRow) => void;
  onToggleActive: (row: AutoPodTableRow) => void;
}

const getRowId = (row: AutoPodTableRow) => row.id;

/** Which partner's details are open, and on which offer. */
interface EnrolledTarget {
  row: AutoPodTableRow;
  role: AutoPodRole;
}

export default function AutoPodsTable({
  t,
  labels,
  fetchRows,
  refetchRef,
  formatDateTime,
  toolbarActions,
  externalFilters,
  onRowClick,
  onViewDetails,
  onEdit,
  onCancel,
  onDelete,
  onViewPod,
  onToggleActive,
}: Readonly<Props>) {
  // The green dot that was clicked; the dialog reads that partner on open.
  const [enrolled, setEnrolled] = useState<EnrolledTarget | null>(null);
  const columns = useMemo(
    () =>
      getAutoPodColumns({
        t,
        labels,
        formatDateTime,
        onViewDetails,
        onEdit,
        onCancel,
        onDelete,
        onViewPod,
        onToggleActive,
        onEnrolledDetails: (row, role) => setEnrolled({ row, role }),
      }),
    [t, labels, formatDateTime, onViewDetails, onEdit, onCancel, onDelete, onViewPod, onToggleActive]
  );

  return (
    <>
      <DuncitTable<AutoPodTableRow>
        tableId="admin-auto-pods"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        toolbarActions={toolbarActions}
        externalFilters={externalFilters}
        emptyText={t('admin.autoPods.empty')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        refetchRef={refetchRef}
        onRowClick={onRowClick}
      />
      {enrolled ? (
        <AutoPodEnrolledDialog
          row={enrolled.row}
          role={enrolled.role}
          onClose={() => setEnrolled(null)}
          t={t}
          labels={labels}
          formatDateTime={formatDateTime}
        />
      ) : null}
    </>
  );
}
