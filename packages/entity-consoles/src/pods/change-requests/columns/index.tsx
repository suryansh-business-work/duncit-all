import { Chip } from '@mui/material';
import { formatDateCell, type DuncitColumn } from '@duncit/table';
import {
  changeRequestStatusKey,
  changeRequestTone,
  type PodChangeRole,
  type PodChangeRow,
} from '@duncit/utils';
import ActionsCell from './ActionsCell';
import { PodCell, RequesterCell } from './cells';
import type { Translate } from './types';

/**
 * The queue's own vocabulary, as the column filter offers it.
 *
 * The VALUES are the SDL enum's, so the server's allowlist accepts them
 * unchanged; the LABELS come from the same keys the status chip renders, so the
 * filter and the cell can never disagree about what a state is called.
 */
const statusOptions = (t: Translate) =>
  (['OPEN', 'OFFERED', 'RESOLVED', 'WITHDRAWN'] as const).map((value) => ({
    value,
    label: t(changeRequestStatusKey({ status: value, resolution: 'NONE' })),
  }));

export interface ChangeRequestColumnDeps {
  role: PodChangeRole;
  t: Translate;
  onCancelPod: (row: PodChangeRow) => void;
  onAssign: (row: PodChangeRow) => void;
}

/**
 * The queue's columns.
 *
 * Every renderer-only cell carries a `valueGetter` that changes with its data:
 * AG Grid repaints on the VALUE, so a pure renderer freezes on the pre-mutation
 * row after a refetch — and the value is also what a CSV export writes.
 */
export function buildChangeRequestColumns(
  deps: Readonly<ChangeRequestColumnDeps>
): DuncitColumn<PodChangeRow>[] {
  const { role, t, onCancelPod, onAssign } = deps;
  return [
    {
      field: 'change_request_no',
      headerName: t('admin.changeRequests.colRequestId'),
      type: 'text',
      width: 170,
    },
    {
      field: 'pod',
      headerName: t('admin.changeRequests.colPod'),
      type: 'text',
      // Joined onto each row from the pods collection after the page is read — the request stores only the pod id.
      sortable: false,
      filterable: false,
      width: 240,
      valueGetter: (row) => `${row.pod.pod_title} ${row.pod_cancelled ? '(cancelled)' : ''}`.trim(),
      cellRenderer: (row) => <PodCell row={row} t={t} />,
    },
    {
      field: 'requested_by',
      headerName: t('admin.changeRequests.colRequestedBy'),
      type: 'text',
      // Joined onto each row from the users collection — the request stores only the requester's id.
      sortable: false,
      filterable: false,
      width: 260,
      valueGetter: (row) =>
        [row.requested_by.full_name, row.requested_by.phone, row.requested_by.email]
          .filter(Boolean)
          .join(' · '),
      cellRenderer: (row) => <RequesterCell row={row} />,
    },
    {
      field: 'created_at',
      headerName: t('admin.changeRequests.colRequestedAt'),
      type: 'date',
      width: 180,
      valueGetter: (row) => formatDateCell(row.created_at),
    },
    {
      field: 'attendees',
      headerName: t('admin.changeRequests.colAttendees'),
      type: 'number',
      // Counted per row from the pod's members at read time — not a stored field.
      sortable: false,
      filterable: false,
      width: 120,
      valueGetter: (row) => row.pod.attendee_count,
    },
    {
      field: 'status',
      headerName: t('admin.changeRequests.colStatus'),
      type: 'enum',
      options: statusOptions(t),
      width: 210,
      valueGetter: (row) => t(changeRequestStatusKey(row)),
      cellRenderer: (row) => (
        <Chip
          size="small"
          color={changeRequestTone(row)}
          label={t(changeRequestStatusKey(row))}
          sx={{ fontWeight: 700 }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: t('shell.common.actions'),
      type: 'actions',
      width: 130,
      // Keyed on the state BOTH buttons read, so the cell repaints the moment
      // an offer lands or the pod is cancelled.
      valueGetter: (row) => `${row.status}:${row.pod_cancelled}`,
      cellRenderer: (row) => (
        <ActionsCell
          row={row}
          role={role}
          t={t}
          onCancelPod={onCancelPod}
          onAssign={onAssign}
        />
      ),
    },
  ];
}
