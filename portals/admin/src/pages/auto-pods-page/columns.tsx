import { AutoPodTicks } from '@duncit/auto-pods';
import { actionsColumn, entityIdColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import { autoPodCityLabel, formatMoney, type AutoPodLabels } from '@duncit/utils';
import { AutoPodStageChip, CancelAutoPodButton, ViewPodButton } from './AutoPodStageChip';
import {
  clubNameOf,
  hostNameOf,
  isAutoPodDeletable,
  isAutoPodEditable,
  stageFilterOptions,
  STAGE_LABEL_KEY,
  venueNameOf,
} from './helpers';
import type { AutoPodTableRow } from './queries';

export interface AutoPodColumnDeps {
  t: (key: string) => string;
  /** The shared Auto Pod copy — the tick row is the same three words everywhere. */
  labels: AutoPodLabels;
  formatDateTime: (value: string) => string;
  onEdit: (row: AutoPodTableRow) => void;
  onCancel: (row: AutoPodTableRow) => void;
  onDelete: (row: AutoPodTableRow) => void;
  onViewPod: (row: AutoPodTableRow) => void;
}

/**
 * Columns for `adminAutoPodsTable`. Only the fields the server allowlists are
 * sortable or filterable (stage, pod_amount, created_at plus the sort keys) —
 * everything derived from a claim is read-only chrome.
 *
 * The Enrolments cell renders a React component; DuncitTable's column builder
 * already stamps `equals: () => false` on every column with a `cellRenderer`,
 * which is what keeps the ticks repainting as partners enrol.
 */
export function getAutoPodColumns(deps: Readonly<AutoPodColumnDeps>): DuncitColumn<AutoPodTableRow>[] {
  const { t, labels, formatDateTime, onEdit, onCancel, onDelete, onViewPod } = deps;
  const viewPodLabel = t('admin.autoPods.viewPod');
  const cancelLabel = t('admin.autoPods.cancel');
  const anyCity = t('admin.autoPods.anyCity');

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
      field: 'category_name',
      headerName: t('admin.autoPods.colCategory'),
      sortable: false,
      minWidth: 150,
      valueGetter: (row) => row.category_name || EM_DASH,
    },
    {
      field: 'location',
      headerName: t('admin.autoPods.colLocation'),
      sortable: false,
      minWidth: 160,
      valueGetter: (row) => autoPodCityLabel(row.location) || anyCity,
    },
    {
      field: 'pod_amount',
      headerName: t('admin.autoPods.colPrice'),
      filter: { type: 'number' },
      width: 120,
      valueGetter: (row) => formatMoney(row.pod_amount),
    },
    {
      field: 'no_of_spots',
      headerName: t('admin.autoPods.colSpots'),
      width: 100,
      valueGetter: (row) => row.no_of_spots,
    },
    {
      field: 'enrolments',
      headerName: t('admin.autoPods.colEnrolments'),
      sortable: false,
      minWidth: 330,
      cellRenderer: (row) => <AutoPodTicks row={row} labels={labels} />,
      // Keyed on who has enrolled so the cell's plain-text value (search,
      // export) tracks the chips rather than going stale at three dashes.
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
    {
      field: 'venue_claim',
      headerName: t('admin.autoPods.colVenue'),
      sortable: false,
      minWidth: 150,
      valueGetter: venueNameOf,
    },
    {
      field: 'host_claim',
      headerName: t('admin.autoPods.colHost'),
      sortable: false,
      minWidth: 150,
      valueGetter: hostNameOf,
    },
    {
      field: 'club_claim',
      headerName: t('admin.autoPods.colClub'),
      sortable: false,
      minWidth: 150,
      valueGetter: clubNameOf,
    },
    {
      field: 'created_at',
      headerName: t('admin.autoPods.colCreatedAt'),
      filter: { type: 'date' },
      width: 180,
      valueGetter: (row) => (row.created_at ? formatDateTime(row.created_at) : EM_DASH),
    },
    actionsColumn<AutoPodTableRow>({
      headerName: t('admin.autoPods.colActions'),
      width: 190,
      onEdit,
      onDelete,
      edit: {
        title: t('admin.autoPods.edit'),
        disabled: (row) => !isAutoPodEditable(row),
        disabledTitle: t('admin.autoPods.editLiveHint'),
      },
      delete: {
        title: t('admin.autoPods.delete'),
        disabled: (row) => !isAutoPodDeletable(row),
        disabledTitle: t('admin.autoPods.deleteLiveHint'),
      },
      renderExtra: (row) => (
        <>
          <ViewPodButton row={row} label={viewPodLabel} onClick={onViewPod} />
          <CancelAutoPodButton row={row} label={cancelLabel} onClick={onCancel} />
        </>
      ),
    }),
  ];
}
