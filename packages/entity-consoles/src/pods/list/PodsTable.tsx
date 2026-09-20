import { useCallback, useMemo, type MutableRefObject, type ReactNode } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import { DuncitTable, type TableFetch } from '@duncit/table';
import { useFeatureFlag } from '@duncit/app-settings';
import { buildPodsColumns, type PodsColumnDeps } from './podsColumns';
import { isBelowMinPax } from './podsColumns.values';
import type { PodRow } from './queries';
import { useTranslation } from '@duncit/shell';

/** The column deps are the page's own callbacks; the table adds only what
 *  it wires itself (the translator and the product flag come from hooks). */
interface Props extends Omit<PodsColumnDeps, 't' | 'showProducts'> {
  fetchRows: TableFetch<PodRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
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
  minPax,
  onEdit,
  onQuickEdit,
  onDelete,
  onComplete,
  onMonitor,
  onView,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const showProducts = useFeatureFlag('is_product_visible');
  // A pod the auto-cancel sweep would cancel, or one short of its activity's
  // minimum people, is a row an admin must not scroll past — red across the
  // whole row, not just a chip in one cell.
  const getRowStyle = useCallback(
    (p: PodRow) =>
      (p.cancellation_risk?.at_risk && !p.is_deleted) || isBelowMinPax(p, minPax(p.club_id))
        ? { backgroundColor: alpha(theme.palette.error.main, 0.14) }
        : undefined,
    [theme, minPax],
  );
  const columns = useMemo(
    () =>
      buildPodsColumns({
        showProducts,
        clubName,
        venueName,
        locName,
        minPax,
        onEdit,
        onQuickEdit,
        onDelete,
        onComplete,
        onMonitor,
        t,
      }),
    [showProducts, clubName, venueName, locName, minPax, onEdit, onQuickEdit, onDelete, onComplete, onMonitor, t],
  );

  return (
    <DuncitTable<PodRow>
      tableId="admin-pods"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getPodRowId}
      onRowClick={onView}
      getRowStyle={getRowStyle}
      toolbarActions={toolbarActions}
      emptyText={t('admin.pods.empty')}
      defaultSort={{ field: 'pod_date_time', dir: 'desc' }}
      searchPlaceholder="Search title or pod ID"
      refetchRef={refetchRef}
    />
  );
}
