import { useMemo, type MutableRefObject } from 'react';
import { Link, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import MeetingRowActions from './MeetingRowActions';
import { meetingStatusLabel } from './statusLabel';
import type { MeetingApprovalStatus, OnboardingMeeting } from './queries';

const STATUS_COLORS: StatusColorMap = {
  REQUESTED: 'default',
  SCHEDULED: 'info',
  DONE: 'success',
  CANCELLED: 'error',
};
const APPROVAL_LABELS: Record<MeetingApprovalStatus, string> = {
  NONE: '—',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  DENIED: 'Denied',
};
const APPROVAL_COLORS: StatusColorMap = {
  NONE: 'default',
  PENDING: 'warning',
  APPROVED: 'success',
  DENIED: 'error',
};
const APPROVAL_OPTIONS = (['APPROVED', 'DENIED'] as const).map((s) => ({
  value: s,
  label: APPROVAL_LABELS[s],
}));

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
const catPath = (m: OnboardingMeeting) =>
  [m.super_category_name, m.category_name, m.sub_category_name].filter(Boolean).join(' › ') || '—';

/** Onboarding decision on the interviewer's feedback. */
function ApprovalCell({ status }: Readonly<{ status?: MeetingApprovalStatus | null }>) {
  const value = status ?? 'NONE';
  if (value === 'NONE')
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  return <StatusChip status={value} label={APPROVAL_LABELS[value]} colorMap={APPROVAL_COLORS} />;
}

/** Join link is hidden once a meeting is cancelled or admin-denied. */
function JoinCell({ meeting }: Readonly<{ meeting: OnboardingMeeting }>) {
  const blocked = meeting.status === 'CANCELLED' || meeting.approval_status === 'DENIED';
  if (meeting.meeting_link && !blocked) {
    return (
      <Link href={meeting.meeting_link} target="_blank" rel="noopener" variant="body2">
        Join
      </Link>
    );
  }
  return (
    <Typography variant="body2" color="text.secondary">
      —
    </Typography>
  );
}

const getMeetingRowId = (m: OnboardingMeeting) => m.id;

const renderRequestNo = (m: OnboardingMeeting) => (
  <Typography
    variant="body2"
    fontWeight={800}
    sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}
  >
    {m.request_no || '—'}
  </Typography>
);

const requesterValue = (m: OnboardingMeeting) => m.user_name || m.contact_name || '—';

const renderJoin = (m: OnboardingMeeting) => <JoinCell meeting={m} />;

const renderMeetingStatus = (m: OnboardingMeeting) => (
  <>
    <StatusChip status={m.status} colorMap={STATUS_COLORS} label={meetingStatusLabel(m)} />
    {m.status === 'CANCELLED' && m.cancel_reason && (
      <Typography variant="caption" color="text.secondary" display="block">
        {m.cancel_reason}
      </Typography>
    )}
  </>
);

const renderApproval = (m: OnboardingMeeting) => <ApprovalCell status={m.approval_status} />;

interface Props {
  fetchRows: TableFetch<OnboardingMeeting>;
  refetchRef: MutableRefObject<(() => void) | null>;
  marking: boolean;
  onSelect: (m: OnboardingMeeting) => void;
  onSchedule: (m: OnboardingMeeting) => void;
  onMarkDone: (m: OnboardingMeeting) => void;
  onDecide: (m: OnboardingMeeting) => void;
  onReject: (m: OnboardingMeeting) => void;
  onRequester: (m: OnboardingMeeting) => void;
}

export default function MeetingsTable({
  fetchRows,
  refetchRef,
  marking,
  onSelect,
  onSchedule,
  onMarkDone,
  onDecide,
  onReject,
  onRequester,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<OnboardingMeeting>[]>(() => {
    const renderRequester = (m: OnboardingMeeting) => (
      <>
        <Link
          component="button"
          type="button"
          variant="body2"
          fontWeight={700}
          onClick={(e) => {
            e.stopPropagation();
            onRequester(m);
          }}
          sx={{ textAlign: 'left' }}
        >
          {requesterValue(m)}
        </Link>
        <Typography variant="caption" color="text.secondary" display="block">
          {m.user_email || m.contact_phone || ''}
        </Typography>
      </>
    );
    const renderActions = (m: OnboardingMeeting) => (
      <MeetingRowActions
        meeting={m}
        marking={marking}
        onSchedule={onSchedule}
        onMarkDone={onMarkDone}
        onDecide={onDecide}
        onReject={onReject}
      />
    );
    return [
      {
        field: 'request_no',
        headerName: 'Request ID',
        minWidth: 150,
        cellRenderer: renderRequestNo,
        valueGetter: (m) => m.request_no || '—',
      },
      {
        field: 'requester',
        headerName: 'Requester',
        sortable: false,
        flex: 1,
        minWidth: 170,
        cellRenderer: renderRequester,
        valueGetter: requesterValue,
      },
      {
        field: 'category',
        headerName: 'Category',
        sortable: false,
        minWidth: 190,
        valueGetter: catPath,
      },
      {
        field: 'requested_at',
        headerName: 'Requested for',
        minWidth: 170,
        filter: { type: 'date' },
        valueGetter: (m) => fmt(m.requested_at),
      },
      {
        field: 'scheduled_at',
        headerName: 'Scheduled',
        minWidth: 170,
        filter: { type: 'date' },
        valueGetter: (m) => fmt(m.scheduled_at),
      },
      {
        field: 'link',
        headerName: 'Link',
        sortable: false,
        width: 90,
        cellRenderer: renderJoin,
        // Renderer-only column: give it a value that changes whenever the Join
        // link (or the cancelled/denied gate) changes, so AG Grid's immutable
        // diffing re-renders it after a refetch instead of freezing on the
        // pre-save row (stale "—" until a manual refresh).
        valueGetter: (m) => `${m.meeting_link ?? ''}|${m.status}|${m.approval_status ?? 'NONE'}`,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 140,
        cellRenderer: renderMeetingStatus,
        valueGetter: (m) => m.status,
      },
      {
        field: 'approval_status',
        headerName: 'Approval',
        width: 150,
        filter: { type: 'select', options: APPROVAL_OPTIONS },
        cellRenderer: renderApproval,
        valueGetter: (m) => APPROVAL_LABELS[m.approval_status ?? 'NONE'],
      },
      {
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        width: 90,
        cellRenderer: renderActions,
        // Renderer-only column: the available actions depend on status +
        // approval_status, and the cell's closure carries the whole row into the
        // Schedule dialog on reopen — so key the value on every field that must
        // re-render the cell (status/approval for the menu; scheduled_at +
        // meeting_link so a reschedule shows its saved day/link). Without this
        // the cell froze on the pre-mutation row: after "Mark done" the menu kept
        // the SCHEDULED actions (no "Approve / Deny") so applicants never
        // onboarded, and reopening after a save showed a blank link/day.
        valueGetter: (m) =>
          `${m.status}|${m.approval_status ?? 'NONE'}|${m.scheduled_at ?? ''}|${m.meeting_link ?? ''}`,
      },
    ];
  }, [marking, onSchedule, onMarkDone, onDecide, onReject, onRequester]);

  return (
    <DuncitTable<OnboardingMeeting>
      tableId="onboarding-meetings"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getMeetingRowId}
      onRowClick={onSelect}
      emptyText="No meetings for this filter."
      searchPlaceholder="Search request no, name or phone"
      refetchRef={refetchRef}
    />
  );
}
