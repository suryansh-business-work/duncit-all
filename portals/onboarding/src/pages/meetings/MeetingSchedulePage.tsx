import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import { useApolloTableFetch, type TableFilterValue } from '@duncit/table';
import CancelMeetingDialog from './CancelMeetingDialog';
import DecisionDialog from './DecisionDialog';
import MeetingDetailsDrawer from './MeetingDetailsDrawer';
import MeetingsTable from './MeetingsTable';
import ScheduleMeetingDialog from './ScheduleMeetingDialog';
import {
  ONBOARDING_MEETINGS_TABLE,
  UPDATE_MEETING,
  type MeetingStatus,
  type OnboardingMeeting,
  type SurveyKind,
} from './queries';

const STATUS_FILTERS: { value: MeetingStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'DONE', label: 'Done' },
  { value: 'CANCELLED', label: 'Cancelled' },
];
const KIND_LABELS: Record<SurveyKind, string> = { VENUE: 'Venue', HOST: 'Host', ECOMM: 'Seller', CLUB_ADMIN: 'Club Admin' };
const MEETING_STATUS_VALUES = new Set<MeetingStatus>(['REQUESTED', 'SCHEDULED', 'DONE', 'CANCELLED']);

/** Onboarding → Meeting → Venue/Host/Seller Meeting Schedule: requests + scheduling. */
export default function MeetingSchedulePage() {
  const params = useParams<{ kind: string }>();
  const kind = (params.kind?.toUpperCase() as SurveyKind) || 'VENUE';
  const valid = kind === 'VENUE' || kind === 'HOST' || kind === 'ECOMM' || kind === 'CLUB_ADMIN';
  const [searchParams, setSearchParams] = useSearchParams();
  // Seed the status filter from ?status= (e.g. the Dashboard meeting cards link
  // to ?status=REQUESTED) and keep the URL in sync so the view is shareable.
  const urlStatus = (searchParams.get('status') || '').toUpperCase() as MeetingStatus;
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | ''>(
    MEETING_STATUS_VALUES.has(urlStatus) ? urlStatus : '',
  );

  const onStatusChange = (next: MeetingStatus | '') => {
    setStatusFilter(next);
    const params2 = new URLSearchParams(searchParams);
    if (next) params2.set('status', next);
    else params2.delete('status');
    setSearchParams(params2, { replace: true });
  };

  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const refresh = useCallback(() => refetchRef.current?.(), []);
  const [updateMeeting, { loading: marking }] = useMutation(UPDATE_MEETING);
  const [editing, setEditing] = useState<OnboardingMeeting | null>(null);
  const [cancelling, setCancelling] = useState<OnboardingMeeting | null>(null);
  const [deciding, setDeciding] = useState<OnboardingMeeting | null>(null);
  const [selected, setSelected] = useState<OnboardingMeeting | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const pinnedFilters: TableFilterValue[] = [{ field: 'kind', op: 'eq', value: kind }];
  if (statusFilter) pinnedFilters.push({ field: 'status', op: 'eq', value: statusFilter });
  const fetchRows = useApolloTableFetch<OnboardingMeeting>(
    client,
    ONBOARDING_MEETINGS_TABLE,
    'onboardingMeetingsTable',
    { extraFilters: pinnedFilters },
    [kind, statusFilter],
  );

  if (!valid) return <Alert severity="error">Unknown meeting kind.</Alert>;

  const markDone = async (m: OnboardingMeeting) => {
    setActionError(null);
    try {
      await updateMeeting({ variables: { id: m.id, input: { status: 'DONE' } } });
      refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not mark the meeting as done');
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <EventIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={800}>{KIND_LABELS[kind]} Meeting Schedule</Typography>
          <Typography variant="body2" color="text.secondary">Onboarding meeting requests from {KIND_LABELS[kind].toLowerCase()} applicants.</Typography>
        </Box>
      </Stack>

      <ToggleButtonGroup size="small" exclusive value={statusFilter} onChange={(_, v) => onStatusChange(v ?? '')}>
        {STATUS_FILTERS.map((f) => <ToggleButton key={f.label} value={f.value}>{f.label}</ToggleButton>)}
      </ToggleButtonGroup>

      {actionError && <Alert severity="error" onClose={() => setActionError(null)}>{actionError}</Alert>}

      {/* Remount when the route kind or status toggle changes so the query restarts from page 1. */}
      <MeetingsTable
        key={`${kind}:${statusFilter}`}
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        marking={marking}
        onSelect={setSelected}
        onSchedule={setEditing}
        onMarkDone={markDone}
        onDecide={setDeciding}
        onReject={setCancelling}
      />

      <ScheduleMeetingDialog meeting={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />
      <CancelMeetingDialog meeting={cancelling} onClose={() => setCancelling(null)} onCancelled={refresh} />
      <DecisionDialog meeting={deciding} onClose={() => setDeciding(null)} onDecided={refresh} />
      <MeetingDetailsDrawer
        meeting={selected}
        onClose={() => setSelected(null)}
        onEdit={(meeting) => { setSelected(null); setEditing(meeting); }}
        onCancel={(meeting) => { setSelected(null); setCancelling(meeting); }}
      />
    </Stack>
  );
}
