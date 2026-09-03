import { AutoPodDependencyTimeline } from '@duncit/auto-pods';
import { activeChipColumn, dateColumn, entityIdColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import type { AutoPodLabels, AutoPodRole } from '@duncit/utils';
import { AutoPodStageChip } from './AutoPodStageChip';
import AutoPodRowMenu from './AutoPodRowMenu';
import {
  categoryPathOf,
  clubNameOf,
  hostNameOf,
  modeLabelOf,
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
  onViewDetails: (row: AutoPodTableRow) => void;
  onEdit: (row: AutoPodTableRow) => void;
  onCancel: (row: AutoPodTableRow) => void;
  onDelete: (row: AutoPodTableRow) => void;
  onViewPod: (row: AutoPodTableRow) => void;
  onToggleActive: (row: AutoPodTableRow) => void;
  /** A green dot on the dependency line opens whoever took that place. */
  onEnrolledDetails: (row: AutoPodTableRow, role: AutoPodRole) => void;
}

/**
 * Columns for `adminAutoPodsTable`: the offer's id and title, its Super ›
 * Category › Sub, whether it is physical or virtual, the Venue → Host → Club
 * Admin dependency line, the stage, whether it is paused, when it was written
 * and last touched, and the row menu. Only the fields the server allowlists
 * are sortable or filterable — the dependency filter is not a field at all:
 * the server lifts `pending` out of the filters and turns it into a "still
 * waiting on" clause.
 *
 * The dependency cell renders a React component; DuncitTable's column builder
 * already stamps `equals: () => false` on every column with a `cellRenderer`,
 * which is what keeps the dots repainting as partners enrol.
 */
export function getAutoPodColumns(deps: Readonly<AutoPodColumnDeps>): DuncitColumn<AutoPodTableRow>[] {
  const {
    t,
    labels,
    formatDateTime,
    onViewDetails,
    onEdit,
    onCancel,
    onDelete,
    onViewPod,
    onToggleActive,
    onEnrolledDetails,
  } = deps;
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
      field: 'pod_mode',
      headerName: t('admin.autoPods.colMode'),
      width: 120,
      filter: {
        type: 'select',
        options: [
          { value: 'PHYSICAL', label: labels.modePhysical },
          { value: 'VIRTUAL', label: labels.modeVirtual },
        ],
      },
      valueGetter: (row) => modeLabelOf(row, labels),
    },
    {
      field: 'pending',
      headerName: t('admin.autoPods.colDependency'),
      sortable: false,
      minWidth: 380,
      filter: { type: 'select', options: pendingFilterOptions(t), multiple: true },
      cellRenderer: (row) => (
        <AutoPodDependencyTimeline
          row={row}
          labels={labels}
          onEnrolledClick={(role) => onEnrolledDetails(row, role)}
        />
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
          onViewDetails={onViewDetails}
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
