import { Chip, Stack, Tooltip, Typography } from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { DuncitIconButton } from '@duncit/buttons';
import { formatDateCell, type DuncitColumn } from '@duncit/table';
import {
  changeRequestStatusKey,
  changeRequestTone,
  type PodChangeRole,
  type PodChangeRow,
} from '@duncit/utils';

type Translate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

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

/** "Assign a different venue / host / club admin", per tab. */
const ASSIGN_KEY: Record<PodChangeRole, string> = {
  VENUE: 'admin.changeRequests.assignVenue',
  HOST: 'admin.changeRequests.assignHost',
  CLUB_ADMIN: 'admin.changeRequests.assignClubAdmin',
};

/** Who asked, with the contacts an admin needs to reach them. */
function RequesterCell({ row }: Readonly<{ row: PodChangeRow }>) {
  const who = row.requested_by;
  const context = row.role === 'VENUE' ? row.from_venue_name : row.from_club_name;
  return (
    <Stack component="span" sx={{ lineHeight: 1.25, py: 0.5 }}>
      <Typography variant="body2" component="span" sx={{ fontWeight: 700 }}>
        {who.full_name || who.email || '—'}
      </Typography>
      {context && (
        <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
          {context}
        </Typography>
      )}
      <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
        {[who.phone, who.email].filter(Boolean).join(' · ') || '—'}
      </Typography>
    </Stack>
  );
}

/** The pod, with the state it is in — a cancelled pod is not offerable. */
function PodCell({ row, t }: Readonly<{ row: PodChangeRow; t: Translate }>) {
  return (
    <Stack component="span" sx={{ lineHeight: 1.25, py: 0.5 }}>
      <Typography variant="body2" component="span" sx={{ fontWeight: 700 }}>
        {row.pod.pod_title}
      </Typography>
      <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
        {formatDateCell(row.pod.pod_date_time)}
      </Typography>
      {row.pod_cancelled && (
        <Typography variant="caption" component="span" sx={{ color: 'error.main', fontWeight: 700 }}>
          {t('changeRequest.resolvedCancelled')}
        </Typography>
      )}
    </Stack>
  );
}

interface ActionsProps {
  row: PodChangeRow;
  role: PodChangeRole;
  t: Translate;
  onCancelPod: (row: PodChangeRow) => void;
  onAssign: (row: PodChangeRow) => void;
}

/**
 * The two answers an admin has.
 *
 * The cross is DESTRUCTIVE — it ends the pod and records a refund against every
 * attendee's payment — so it carries a tooltip that says exactly that, and both
 * are closed once the request is no longer live: a resolved request has nothing
 * left to act on, and an offered one is somebody else's turn.
 */
function ActionsCell({ row, role, t, onCancelPod, onAssign }: Readonly<ActionsProps>) {
  const offered = row.status === 'OFFERED';
  const closed = row.status === 'RESOLVED' || row.status === 'WITHDRAWN';
  const waitingOn = offered
    ? t('admin.changeRequests.alreadyOffered', {
        vars: { name: row.offer?.display_name ?? '' },
      })
    : undefined;

  return (
    <Stack component="span" direction="row" spacing={0.25} sx={{ justifyContent: 'flex-end' }}>
      <Tooltip title={waitingOn ?? t(ASSIGN_KEY[role])}>
        <span>
          <DuncitIconButton
            size="small"
            color="warning"
            disabled={closed || offered}
            aria-label={t(ASSIGN_KEY[role])}
            onClick={() => onAssign(row)}
          >
            <SwapHorizIcon fontSize="small" />
          </DuncitIconButton>
        </span>
      </Tooltip>
      <Tooltip title={t('admin.changeRequests.cancelTooltip')}>
        <span>
          <DuncitIconButton
            size="small"
            color="error"
            disabled={closed || row.pod_cancelled}
            aria-label={t('admin.changeRequests.cancelTitle')}
            onClick={() => onCancelPod(row)}
          >
            <EventBusyIcon fontSize="small" />
          </DuncitIconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}

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
      width: 170,
      filter: { type: 'text' },
    },
    {
      field: 'pod',
      headerName: t('admin.changeRequests.colPod'),
      width: 240,
      sortable: false,
      valueGetter: (row) => `${row.pod.pod_title} ${row.pod_cancelled ? '(cancelled)' : ''}`.trim(),
      cellRenderer: (row) => <PodCell row={row} t={t} />,
    },
    {
      field: 'requested_by',
      headerName: t('admin.changeRequests.colRequestedBy'),
      width: 260,
      sortable: false,
      valueGetter: (row) =>
        [row.requested_by.full_name, row.requested_by.phone, row.requested_by.email]
          .filter(Boolean)
          .join(' · '),
      cellRenderer: (row) => <RequesterCell row={row} />,
    },
    {
      field: 'created_at',
      headerName: t('admin.changeRequests.colRequestedAt'),
      width: 180,
      valueGetter: (row) => formatDateCell(row.created_at),
    },
    {
      field: 'attendees',
      headerName: t('admin.changeRequests.colAttendees'),
      width: 120,
      sortable: false,
      valueGetter: (row) => row.pod.attendee_count,
    },
    {
      field: 'status',
      headerName: t('admin.changeRequests.colStatus'),
      width: 210,
      filter: { type: 'select', options: statusOptions(t) },
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
      width: 130,
      sortable: false,
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
