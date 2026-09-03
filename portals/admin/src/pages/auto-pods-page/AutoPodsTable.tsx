import { useMemo, useState, type MutableRefObject, type ReactNode } from 'react';
import { DuncitTable, type TableFetch } from '@duncit/table';
import type { AutoPodLabels } from '@duncit/utils';
import AutoPodVenueDetailsDialog from './AutoPodVenueDetailsDialog';
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
  onDelete: (row: AutoPodTableRow) => void;
  onViewPod: (row: AutoPodTableRow) => void;
  onToggleActive: (row: AutoPodTableRow) => void;
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
  onDelete,
  onViewPod,
  onToggleActive,
}: Readonly<Props>) {
  // The row whose green Venue dot was clicked; the dialog reads the venue on open.
  const [venueRow, setVenueRow] = useState<AutoPodTableRow | null>(null);
  const columns = useMemo(
    () =>
      getAutoPodColumns({
        t,
        labels,
        formatDateTime,
        onEdit,
        onCancel,
        onDelete,
        onViewPod,
        onToggleActive,
        onVenueDetails: setVenueRow,
      }),
    [t, labels, formatDateTime, onEdit, onCancel, onDelete, onViewPod, onToggleActive]
  );

  return (
    <>
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
      {venueRow ? (
        <AutoPodVenueDetailsDialog
          row={venueRow}
          onClose={() => setVenueRow(null)}
          t={t}
          labels={labels}
          formatDateTime={formatDateTime}
        />
      ) : null}
    </>
  );
}
