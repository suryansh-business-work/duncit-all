import { AutoPodDependencyTimeline, AutoPodExpiryNote } from '@duncit/auto-pods';
import { activeChipColumn, dateColumn, entityIdColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import type { AutoPodLabels } from '@duncit/utils';
import { AutoPodStageChip } from './AutoPodStageChip';
import AutoPodRowMenu from './AutoPodRowMenu';
import {
  categoryPathOf,
  clubNameOf,
  hostNameOf,
  pendingFilterOptions,
  stageFilterOptions,
  STAGE_LABEL_KEY,
  venueNameOf,
} from './helpers';
import type { AutoPodTableRow } from './queries';

export interface AutoPodColumnDeps {
  t: (key: string) => string;
  /** The shared Auto Pod copy — the dependency line uses the same three role words as every card. */
  labels: AutoPodLabels;
  formatDateTime: (value: string) => string;
  onEdit: (row: AutoPodTableRow) => void;
  onCancel: (row: AutoPodTableRow) => void;
  onDelete: (row: AutoPodTableRow) => void;
  onViewPod: (row: AutoPodTableRow) => void;
  onToggleActive: (row: AutoPodTableRow) => void;
  /** The green Venue dot on the dependency line opens that venue's details. */
  onVenueDetails: (row: AutoPodTableRow) => void;
}

/**
 * Columns for `adminAutoPodsTable`: the offer's id and title, its Super ›
 * Category › Sub, the Venue → Host → Club Admin dependency line, the stage,
 * whether it is paused, when it was written and last touched, and the row
 * menu. Only the fields the server allowlists are sortable or filterable —
 * the dependency filter is not a field at all: the server lifts `pending`
 * out of the filters and turns it into a "still waiting on" clause.
 *
 * The dependency cell renders a React component; DuncitTable's column builder
 * already stamps `equals: () => false` on every column with a `cellRenderer`,
 * which is what keeps the dots repainting as partners enrol.
 */
export function getAutoPodColumns(deps: Readonly<AutoPodColumnDeps>): DuncitColumn<AutoPodTableRow>[] {
  const { t, labels, formatDateTime, onEdit, onCancel, onDelete, onViewPod, onToggleActive, onVenueDetails } =
    deps;
  const formatDate = (date: Date) => formatDateTime(date.toISOString());

  return [
    entityIdColumn<AutoPodTableRow>({
      field: 'auto_pod_no',
      headerName: t('admin.autoPods.colAutoPodNo'),
      width: 150,
      filterable: false,
    }),
    {
      field: 'pod_title',
      headerName: t('admin.autoPods.colTitle'),
      flex: 1,
      minWidth: 200,
      valueGetter: (row) => row.pod_title,
    },
    {
      field: 'category_path',
      headerName: t('admin.autoPods.colCategory'),
      sortable: false,
      minWidth: 220,
      valueGetter: (row) => categoryPathOf(row) || EM_DASH,
    },
    {
      field: 'pending',
      headerName: t('admin.autoPods.colDependency'),
      sortable: false,
      minWidth: 380,
      filter: { type: 'select', options: pendingFilterOptions(t), multiple: true },
      cellRenderer: (row) => (
        <AutoPodDependencyTimeline row={row} labels={labels} onVenueClick={() => onVenueDetails(row)} />
      ),
      // Keyed on who has enrolled so the cell's plain-text value (search,
      // export) tracks the dots rather than going stale at three dashes.
      valueGetter: (row) => `${venueNameOf(row)} / ${hostNameOf(row)} / ${clubNameOf(row)}`,
    },
    {
      field: 'stage',
      headerName: t('admin.autoPods.colStage'),
      filter: { type: 'select', options: stageFilterOptions(t) },
      width: 170,
      cellRenderer: (row) => <AutoPodStageChip row={row} t={t} />,
      valueGetter: (row) => t(STAGE_LABEL_KEY[row.stage]),
    },
    activeChipColumn<AutoPodTableRow>({
      field: 'is_active',
      headerName: t('admin.autoPods.colActive'),
      activeLabel: t('admin.autoPods.active'),
      inactiveLabel: t('admin.autoPods.paused'),
      width: 110,
    }),
    {
      // Pod Settings' assignment window, counted down live off the shared note.
      // Not a stored field, so the server can neither sort nor filter on it
      // (no `filter` = no filter).
      field: 'expires_at',
      headerName: t('admin.autoPods.colExpiresIn'),
      sortable: false,
      width: 190,
      cellRenderer: (row) => <AutoPodExpiryNote expiresAt={row.expires_at} labels={labels} />,
      valueGetter: (row) => (row.expires_at ? formatDateTime(row.expires_at) : EM_DASH),
    },
    dateColumn<AutoPodTableRow>({
      field: 'created_at',
      headerName: t('admin.autoPods.colCreatedAt'),
      hide: false,
      width: 180,
      formatDate,
    }),
    dateColumn<AutoPodTableRow>({
      field: 'updated_at',
      headerName: t('admin.autoPods.colUpdatedAt'),
      hide: false,
      width: 180,
      formatDate,
    }),
    {
      field: 'actions',
      headerName: t('admin.autoPods.colActions'),
      width: 80,
      sortable: false,
      cellRenderer: (row) => (
        <AutoPodRowMenu
          row={row}
          t={t}
          onEdit={onEdit}
          onCancel={onCancel}
          onDelete={onDelete}
          onViewPod={onViewPod}
          onToggleActive={onToggleActive}
        />
      ),
    },
  ];
}
