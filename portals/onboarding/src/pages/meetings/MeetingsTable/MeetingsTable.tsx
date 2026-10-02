import { useMemo, type MutableRefObject } from 'react';
import { Link, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import MeetingRowActions from '../MeetingRowActions';
import type { OnboardingMeeting } from '../queries';
import { useTranslation } from '@duncit/app-settings';
import {
  APPROVAL_LABELS,
  APPROVAL_OPTIONS,
  catPath,
  fmt,
  getMeetingRowId,
  renderApproval,
  renderJoin,
  renderMeetingStatus,
  renderRequestNo,
  requesterValue,
} from './cells';

interface Props {
  fetchRows: TableFetch<OnboardingMeeting>;
  refetchRef: MutableRefObject<(() => void) | null>;
  /** Filled by the table with a "replace this row" fn — see DuncitTable. */
  updateRowRef: MutableRefObject<((row: OnboardingMeeting) => void) | null>;
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
  updateRowRef,
  onSelect,
  onSchedule,
  onMarkDone,
  onDecide,
  onReject,
  onRequester,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<OnboardingMeeting>[]>(() => {
    const renderRequester = (m: OnboardingMeeting) => (
      <>
        <Link
          component="button"
          type="button"
          variant="body2"
          onClick={(e) => {
            e.stopPropagation();
            onRequester(m);
          }}
          sx={{
            fontWeight: 700,
            textAlign: 'left'
          }}>
          {requesterValue(m)}
        </Link>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: "block"
          }}>
          {m.user_email || m.contact_phone || ''}
        </Typography>
      </>
    );
    const renderActions = (m: OnboardingMeeting) => (
      <MeetingRowActions
        meeting={m}
        onSchedule={onSchedule}
        onMarkDone={onMarkDone}
        onDecide={onDecide}
        onReject={onReject}
      />
    );
    const statusOptions = [
      { value: 'REQUESTED', label: t('onboarding.meetings.requested') },
      { value: 'SCHEDULED', label: t('onboarding.meetings.scheduled') },
      { value: 'DONE', label: t('onboarding.meetings.done') },
      { value: 'CANCELLED', label: t('onboarding.meetings.cancelled') },
    ];
    return [
      {
        field: 'request_no',
        headerName: t('onboarding.common.requestId'),
        minWidth: 150,
        type: 'text',
        cellRenderer: renderRequestNo,
        valueGetter: (m) => m.request_no || '—',
      },
      {
        field: 'requester',
        headerName: t('onboarding.meetings.requester'),
        type: 'text',
        // The account's name joined from users at read time, else the contact name — no single stored path.
        sortable: false,
        filterable: false,
        flex: 1,
        minWidth: 170,
        cellRenderer: renderRequester,
        valueGetter: requesterValue,
      },
      {
        field: 'category',
        headerName: t('onboarding.common.category'),
        type: 'text',
        // Joined from three category-name lookups at read time — no stored path to order or match.
        sortable: false,
        filterable: false,
        minWidth: 190,
        valueGetter: catPath,
      },
      {
        field: 'requested_at',
        headerName: t('onboarding.meetings.requestedFor'),
        minWidth: 170,
        type: 'date',
        valueGetter: (m) => fmt(m.requested_at),
      },
      {
        field: 'scheduled_at',
        headerName: t('onboarding.meetings.scheduled'),
        minWidth: 170,
        type: 'date',
        valueGetter: (m) => fmt(m.scheduled_at),
      },
      {
        field: 'link',
        headerName: t('onboarding.meetings.link'),
        type: 'text',
        width: 90,
        cellRenderer: renderJoin,
        valueGetter: (m) => m.meeting_link ?? '',
      },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        width: 140,
        type: 'enum',
        options: statusOptions,
        cellRenderer: renderMeetingStatus,
        valueGetter: (m) => m.status,
      },
      {
        field: 'approval_status',
        headerName: t('onboarding.meetings.approval'),
        width: 150,
        type: 'enum',
        options: APPROVAL_OPTIONS,
        cellRenderer: renderApproval,
        valueGetter: (m) => APPROVAL_LABELS[m.approval_status ?? 'NONE'],
      },
      {
        field: 'actions',
        headerName: t('shell.common.actions'),
        type: 'actions',
        width: 90,
        cellRenderer: renderActions,
        // Renderer-only: @duncit/table marks renderer columns never-equal, so the
        // cell repaints on any change to its row. The value exists purely for the
        // CSV export, hence the readable action-availability summary.
        valueGetter: (m) => (m.approval_status === 'DENIED' || m.status === 'CANCELLED' ? '—' : m.status),
      },
    ];
  }, [onSchedule, onMarkDone, onDecide, onReject, onRequester, t]);

  return (
    <DuncitTable<OnboardingMeeting>
      tableId="onboarding-meetings"
      ariaLabel={t('onboarding.dashboard.meetingSchedule')}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getMeetingRowId}
      onRowClick={onSelect}
      emptyText={t('onboarding.meetings.noMeetingsForThisFilter')}
      searchPlaceholder="Search request no, name or phone"
      refetchRef={refetchRef}
      updateRowRef={updateRowRef}
    />
  );
}
