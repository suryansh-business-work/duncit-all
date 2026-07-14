import { useMemo, type MutableRefObject } from 'react';
import { Chip, Link, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import MeetingRowActions from './MeetingRowActions';
import type { MeetingApprovalStatus, MeetingStatus, OnboardingMeeting } from './queries';

const STATUS_COLORS: Record<MeetingStatus, 'default' | 'info' | 'success' | 'error'> = {
  REQUESTED: 'default', SCHEDULED: 'info', DONE: 'success', CANCELLED: 'error',
};
const APPROVAL_LABELS: Record<MeetingApprovalStatus, string> = {
  NONE: '—', PENDING: 'Pending', APPROVED: 'Approved', DENIED: 'Denied',
};
const APPROVAL_COLORS: Record<MeetingApprovalStatus, 'default' | 'warning' | 'success' | 'error'> = {
  NONE: 'default', PENDING: 'warning', APPROVED: 'success', DENIED: 'error',
};
const APPROVAL_OPTIONS = (['PENDING', 'APPROVED', 'DENIED'] as const).map((s) => ({
  value: s,
  label: APPROVAL_LABELS[s],
}));

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
const catPath = (m: OnboardingMeeting) =>
  [m.super_category_name, m.category_name, m.sub_category_name].filter(Boolean).join(' › ') || '—';

/** Admin-approval state of the interviewer's feedback. */
function ApprovalCell({ status }: Readonly<{ status?: MeetingApprovalStatus | null }>) {
  const value = status ?? 'NONE';
  if (value === 'NONE') return <Typography variant="body2" color="text.secondary">—</Typography>;
  return <Chip size="small" color={APPROVAL_COLORS[value]} label={APPROVAL_LABELS[value]} />;
}

/** Join link is hidden once a meeting is cancelled or admin-denied. */
function JoinCell({ meeting }: Readonly<{ meeting: OnboardingMeeting }>) {
  const blocked = meeting.status === 'CANCELLED' || meeting.approval_status === 'DENIED';
  if (meeting.meeting_link && !blocked) {
    return <Link href={meeting.meeting_link} target="_blank" rel="noopener" variant="body2">Join</Link>;
  }
  return <Typography variant="body2" color="text.secondary">—</Typography>;
}

const getMeetingRowId = (m: OnboardingMeeting) => m.id;

const renderRequestNo = (m: OnboardingMeeting) => (
  <Typography variant="body2" fontWeight={800} sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
    {m.request_no || '—'}
  </Typography>
);

const requesterValue = (m: OnboardingMeeting) => m.user_name || m.contact_name || '—';

const renderRequester = (m: OnboardingMeeting) => (
  <>
    <Typography variant="body2" fontWeight={700}>{requesterValue(m)}</Typography>
    <Typography variant="caption" color="text.secondary" display="block">{m.user_email || m.contact_phone || ''}</Typography>
  </>
);

const renderJoin = (m: OnboardingMeeting) => <JoinCell meeting={m} />;

const renderMeetingStatus = (m: OnboardingMeeting) => (
  <>
    <Chip size="small" color={STATUS_COLORS[m.status]} label={m.status} />
    {m.status === 'CANCELLED' && m.cancel_reason && (
      <Typography variant="caption" color="text.secondary" display="block">{m.cancel_reason}</Typography>
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
  onSendFeedback: (m: OnboardingMeeting) => void;
  onReject: (m: OnboardingMeeting) => void;
}

export default function MeetingsTable({
  fetchRows,
  refetchRef,
  marking,
  onSelect,
  onSchedule,
  onMarkDone,
  onSendFeedback,
  onReject,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<OnboardingMeeting>[]>(() => {
    const renderActions = (m: OnboardingMeeting) => (
      <MeetingRowActions
        meeting={m}
        marking={marking}
        onSchedule={onSchedule}
        onMarkDone={onMarkDone}
        onSendFeedback={onSendFeedback}
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
      { field: 'category', headerName: 'Category', sortable: false, minWidth: 190, valueGetter: catPath },
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
      { field: 'link', headerName: 'Link', sortable: false, width: 90, cellRenderer: renderJoin },
      {
        field: 'status',
        headerName: 'Status',
        width: 140,
        cellRenderer: renderMeetingStatus,
        valueGetter: (m) => m.status,
      },
      {
        field: 'approval_status',
        headerName: 'Admin approval',
        width: 150,
        filter: { type: 'select', options: APPROVAL_OPTIONS },
        cellRenderer: renderApproval,
        valueGetter: (m) => APPROVAL_LABELS[m.approval_status ?? 'NONE'],
      },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 90, cellRenderer: renderActions },
    ];
  }, [marking, onSchedule, onMarkDone, onSendFeedback, onReject]);

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
