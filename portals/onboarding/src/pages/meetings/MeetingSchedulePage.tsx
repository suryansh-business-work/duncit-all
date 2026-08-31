import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
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
import { matchesStatusFilter, statusPinnedFilters, type StatusFilterKey } from './statusFilters';
import CancelMeetingDialog from './CancelMeetingDialog';
import DecisionDialog from './DecisionDialog';
import MeetingDetailsDrawer from './MeetingDetailsDrawer';
import MeetingsTable from './MeetingsTable';
import RequesterDialog from './RequesterDialog';
import ScheduleMeetingDialog from './ScheduleMeetingDialog';
import {
  ONBOARDING_MEETINGS_TABLE,
  UPDATE_MEETING,
  type OnboardingMeeting,
  type SurveyKind,
} from './queries';
import { useTranslation } from '@duncit/app-settings';

type Translate = ReturnType<typeof useTranslation>['t'];

const statusFilters = (t: Translate): { value: StatusFilterKey | ''; label: string }[] => [
  { value: '', label: t('onboarding.common.all') },
  { value: 'REQUESTED', label: t('onboarding.meetings.requested') },
  { value: 'SCHEDULED', label: t('onboarding.meetings.scheduled') },
  { value: 'DONE', label: t('onboarding.meetings.done') },
  { value: 'REJECTED', label: t('onboarding.common.rejected') },
  { value: 'CANCELLED', label: t('onboarding.meetings.cancelled') },
];
const KIND_LABELS: Record<SurveyKind, string> = { VENUE: 'Venue', HOST: 'Host', ECOMM: 'E-Commerce Brand', CLUB_ADMIN: 'Club Admin' };
const STATUS_FILTER_KEYS = new Set<StatusFilterKey>(['REQUESTED', 'SCHEDULED', 'DONE', 'REJECTED', 'CANCELLED']);

/** Onboarding → Meeting → Venue/Host/E-Commerce Brand Meeting Schedule: requests + scheduling. */
export default function MeetingSchedulePage() {
  const { t } = useTranslation();
  const params = useParams<{ kind: string }>();
  const kind = (params.kind?.toUpperCase() as SurveyKind) || 'VENUE';
  const valid = kind === 'VENUE' || kind === 'HOST' || kind === 'ECOMM' || kind === 'CLUB_ADMIN';
  const [searchParams, setSearchParams] = useSearchParams();
  // Seed the status filter from ?status= (e.g. the Dashboard meeting cards link
  // to ?status=REQUESTED) and keep the URL in sync so the view is shareable.
  const urlStatus = (searchParams.get('status') || '').toUpperCase() as StatusFilterKey;
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey | ''>(
    STATUS_FILTER_KEYS.has(urlStatus) ? urlStatus : '',
  );

  const onStatusChange = (next: StatusFilterKey | '') => {
    setStatusFilter(next);
    const params2 = new URLSearchParams(searchParams);
    if (next) params2.set('status', next);
    else params2.delete('status');
    setSearchParams(params2, { replace: true });
  };

  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const updateRowRef = useRef<((row: OnboardingMeeting) => void) | null>(null);
  const refresh = useCallback(() => refetchRef.current?.(), []);
  const [updateMeeting] = useMutation<any>(UPDATE_MEETING);
  // Double-submit guard for "Mark done". It is a ref rather than the mutation's
  // `loading` flag because that flag would have to ride into the table's column
  // defs, and a changing column def rebuilds every AG Grid column — closing an
  // open Actions menu and resetting user-resized widths mid-action.
  const markingRef = useRef(false);
  const [editing, setEditing] = useState<OnboardingMeeting | null>(null);
  const [cancelling, setCancelling] = useState<OnboardingMeeting | null>(null);
  const [deciding, setDeciding] = useState<OnboardingMeeting | null>(null);
  const [selected, setSelected] = useState<OnboardingMeeting | null>(null);
  const [requesterOf, setRequesterOf] = useState<OnboardingMeeting | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  /*
    Every action here ends in a mutation that returns the whole updated meeting,
    so the answer is already in hand — the table does not have to go and ask for
    the page again to show a new Status or a new Actions menu. Putting the
    returned row straight in repaints that ONE row and leaves the rest of the
    page, the scroll position and the open page alone.

    A refetch is still the right move in exactly two cases, and only those:
      - nothing came back (an older mutation, or a failure that still wrote), so
        the row on screen cannot be trusted; and
      - the change moves the row OUT of the active status toggle, which is a
        membership change rather than a cell change — only the query knows what
        moves up to take its place.
  */
  const applyMeeting = useCallback(
    (updated?: OnboardingMeeting | null) => {
      if (!updated || !matchesStatusFilter(updated, statusFilter)) {
        refresh();
        return;
      }
      updateRowRef.current?.(updated);
      // Keep the open drawer honest: it is showing a snapshot taken when the
      // row was clicked, and this is the moment that snapshot went stale.
      setSelected((current) => (current?.id === updated.id ? updated : current));
    },
    [refresh, statusFilter],
  );

  const pinnedFilters: TableFilterValue[] = [
    { field: 'kind', op: 'eq', value: kind },
    ...statusPinnedFilters(statusFilter),
  ];
  const fetchRows = useApolloTableFetch<OnboardingMeeting>(
    client,
    ONBOARDING_MEETINGS_TABLE,
    'onboardingMeetingsTable',
    { extraFilters: pinnedFilters },
    [kind, statusFilter],
  );

  // Memoized so the table's column defs stay stable across renders.
  const markDone = useCallback(
    async (m: OnboardingMeeting) => {
      if (markingRef.current) return;
      markingRef.current = true;
      setActionError(null);
      try {
        const res = await updateMeeting({ variables: { id: m.id, input: { status: 'DONE' } } });
        applyMeeting(res.data?.updateMeeting);
      } catch (e) {
        setActionError(e instanceof Error ? e.message : t('onboarding.meetings.couldNotMarkTheMeetingAs'));
        // Refetch on FAILURE too — a mutation that throws after its own write
        // leaves the row already changed in Mongo, and doing nothing here would
        // show the stale status until a manual page reload.
        refresh();
      } finally {
        markingRef.current = false;
      }
    },
    [updateMeeting, applyMeeting, refresh, t],
  );

  if (!valid) return <Alert severity="error">{t('onboarding.meetings.unknownMeetingKind')}</Alert>;

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <EventIcon color="primary" />
        <Box>
          <Typography variant="h5" sx={{
            fontWeight: 800
          }}>{KIND_LABELS[kind]} Meeting Schedule</Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>Onboarding meeting requests from {KIND_LABELS[kind].toLowerCase()} applicants.</Typography>
        </Box>
      </Stack>

      <ToggleButtonGroup size="small" exclusive value={statusFilter} onChange={(_, v) => onStatusChange(v ?? '')}>
        {statusFilters(t).map((f) => <ToggleButton key={f.label} value={f.value}>{f.label}</ToggleButton>)}
      </ToggleButtonGroup>

      {actionError && <Alert severity="error" onClose={() => setActionError(null)}>{actionError}</Alert>}

      {/* Remount when the route kind or status toggle changes so the query restarts from page 1. */}
      <MeetingsTable
        key={`${kind}:${statusFilter}`}
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        updateRowRef={updateRowRef}
        onSelect={setSelected}
        onSchedule={setEditing}
        onMarkDone={markDone}
        onDecide={setDeciding}
        onReject={setCancelling}
        onRequester={setRequesterOf}
      />

      <RequesterDialog meeting={requesterOf} onClose={() => setRequesterOf(null)} />
      <ScheduleMeetingDialog
        meeting={editing}
        onClose={() => setEditing(null)}
        onSaved={(saved) => { setEditing(null); applyMeeting(saved); }}
      />
      <CancelMeetingDialog meeting={cancelling} onClose={() => setCancelling(null)} onCancelled={applyMeeting} />
      <DecisionDialog meeting={deciding} onClose={() => setDeciding(null)} onDecided={applyMeeting} />
      <MeetingDetailsDrawer
        meeting={selected}
        onClose={() => setSelected(null)}
        onEdit={(meeting) => { setSelected(null); setEditing(meeting); }}
        onCancel={(meeting) => { setSelected(null); setCancelling(meeting); }}
      />
    </Stack>
  );
}
