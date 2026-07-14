import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { DuncitTable, type TableFetch } from '@duncit/table';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { buildPodsColumns } from './podsColumns';
import type { PodRow } from './queries';

interface Props {
  fetchRows: TableFetch<PodRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  clubName: (id: string) => string;
  venueName: (id: string) => string;
  locName: (id: string) => string;
  onEdit: (p: PodRow) => void;
  onQuickEdit: (p: PodRow) => void;
  onDelete: (p: PodRow) => void;
  onComplete: (p: PodRow) => void;
  onView: (p: PodRow) => void;
}

const getPodRowId = (p: PodRow) => p.id;

export default function PodsTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  clubName,
  venueName,
  locName,
  onEdit,
  onQuickEdit,
  onDelete,
  onComplete,
  onView,
}: Readonly<Props>) {
  const showProducts = useFeatureFlag('is_product_visible');
  const columns = useMemo(
    () =>
      buildPodsColumns({
        showProducts,
        clubName,
        venueName,
        locName,
        onEdit,
        onQuickEdit,
        onDelete,
        onComplete,
      }),
    [showProducts, clubName, venueName, locName, onEdit, onQuickEdit, onDelete, onComplete],
  );

  return (
    <DuncitTable<PodRow>
      tableId="admin-pods"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getPodRowId}
      onRowClick={onView}
      toolbarActions={toolbarActions}
      emptyText="No pods yet."
      defaultSort={{ field: 'pod_date_time', dir: 'desc' }}
      searchPlaceholder="Search title or pod ID"
      refetchRef={refetchRef}
    />
  );
}
