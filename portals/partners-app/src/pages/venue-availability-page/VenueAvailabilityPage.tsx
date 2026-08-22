import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Card, CardContent, CircularProgress, Stack } from '@mui/material';
import { addDays, format, startOfDay } from 'date-fns';
import {
  AvailabilityCalendar,
  DayDrawer,
  slotCoversDay,
  type CalendarView,
  type NewSlotInput,
  type VenueSpace,
} from '@duncit/availability-calendar';
import {
  CREATE_VENUE_SLOTS,
  DELETE_VENUE_SLOT,
  UPDATE_VENUE_SLOT,
  VENUE_SLOTS,
  type VenueSlotRow,
} from './queries';
import AvailabilityBlocked from './AvailabilityBlocked';
import AvailabilityHeader from './AvailabilityHeader';
import CalendarLegend from './CalendarLegend';
import CalendarToolbar from './CalendarToolbar';
import { periodLabel, shiftAnchor, viewRange } from './calendar-period';
import RecurringAvailabilityDialog from './recurring/RecurringAvailabilityDialog';
import { MY_VENUES } from '../register-venue-page/queries';
import { useTranslation } from '@duncit/shell';

export default function VenueAvailabilityPage() {
  const { t } = useTranslation();
  const { venueId = '' } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const [view, setView] = useState<CalendarView>('month');
  // Anchor on today so Day/Week views open on the current period (month view
  // derives its own startOfMonth). Keeping the 1st here would land Day on a past date.
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [recurringOpen, setRecurringOpen] = useState(false);

  const { data: venuesData } = useQuery(MY_VENUES, { fetchPolicy: 'cache-first' });
  const venue = (venuesData?.myVenues ?? []).find((v: any) => v.id === venueId);
  const isApproved = venue?.status === 'APPROVED';
  const venueHolidays: string[] = venue?.settings?.holidays ?? [];
  // The venue's bookable spaces ("Court 1", …), which both the day drawer and
  // the recurring dialog price separately. Memoized because the recurring
  // dialog re-seeds its space rows whenever this value changes — a fresh `[]`
  // every render would wipe the owner's prices as they typed them.
  const capacityItems: VenueSpace[] = useMemo(() => venue?.capacity_items ?? [], [venue]);

  const range = useMemo(() => viewRange(view, anchor), [view, anchor]);
  const { data, loading, error, refetch } = useQuery<{ venueSlots: VenueSlotRow[] }>(VENUE_SLOTS, {
    variables: { venue_id: venueId, from: range.from.toISOString(), to: range.to.toISOString() },
    fetchPolicy: 'cache-and-network',
    skip: !venueId,
  });

  const [createSlots] = useMutation(CREATE_VENUE_SLOTS);
  const [updateSlot] = useMutation(UPDATE_VENUE_SLOT);
  const [deleteSlot] = useMutation(DELETE_VENUE_SLOT);

  // REPLACE only ever arrives after the drawer's overwrite warning; FAIL keeps
  // an accidental clash a refusal rather than a silent deletion.
  const handleCreate = async (input: NewSlotInput, overwrite: boolean) => {
    await createSlots({
      variables: {
        input: { venue_id: venueId, slots: [input], on_conflict: overwrite ? 'REPLACE' : 'FAIL' },
      },
    });
    await refetch();
  };
  const handleToggleBlock = async (slot: VenueSlotRow) => {
    await updateSlot({ variables: { slot_id: slot.id, input: { block: slot.status !== 'BLOCKED' } } });
    await refetch();
  };
  const handleDelete = async (slotId: string) => {
    await deleteSlot({ variables: { slot_id: slotId } });
    await refetch();
  };

  // Main slot availability is bookable only within the next 60 days — later days
  // are non-selectable in the calendar (server + DayDrawer are the backstop).
  const maxSelectableDate = useMemo(() => addDays(startOfDay(new Date()), 60), []);
  const canGoNext = range.to < maxSelectableDate;

  const shift = (dir: 1 | -1) => {
    if (dir === 1 && !canGoNext) return;
    setAnchor(shiftAnchor(view, anchor, dir));
  };

  const slotsForSelected = useMemo<VenueSlotRow[]>(() => {
    if (!selectedDate) return [];
    // slotCoversDay, not isSameDay(start): a multi-day (activity) booking must
    // appear in the drawer of every day it spans.
    //
    // Space first, then time: a venue with ten courts publishes ten slots for
    // the same hour, and chronological order interleaves them into a list where
    // no court's own day is readable. A venue with no named spaces sorts by
    // time exactly as before, because every space_label is ''.
    return (data?.venueSlots ?? [])
      .filter((s) => slotCoversDay(s, selectedDate))
      .sort((a, b) => {
        const bySpace = (a.space_label ?? '').localeCompare(b.space_label ?? '');
        if (bySpace !== 0) return bySpace;
        return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
      });
  }, [data, selectedDate]);

  if (!venue && venuesData) {
    return (
      <AvailabilityBlocked
        severity="error"
        message={t('partners.venueAvailabilityPage.venueNotFoundOrItIsn')}
      />
    );
  }

  if (!isApproved && venue) {
    return (
      <AvailabilityBlocked
        severity="warning"
        message={t('partners.venueAvailabilityPage.approvalRequired', {
          vars: { status: venue.status },
        })}
      />
    );
  }

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }}>
      <AvailabilityHeader
        venueName={venue?.venue_name}
        onBack={() => navigate('/register-venue')}
      />

      <Card variant="outlined">
        <CardContent>
          <CalendarToolbar
            view={view}
            onView={setView}
            periodLabel={periodLabel(view, anchor, range)}
            onShift={shift}
            canGoNext={canGoNext}
            onToday={() => setAnchor(new Date())}
            onRecurring={() => setRecurringOpen(true)}
          />

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}
          {loading && !data ? (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={24} />
            </Stack>
          ) : (
            <AvailabilityCalendar
              month={anchor}
              view={view}
              slots={data?.venueSlots ?? []}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
              holidays={venueHolidays}
              maxDate={maxSelectableDate}
            />
          )}

          <CalendarLegend />
        </CardContent>
      </Card>

      <DayDrawer
        open={!!selectedDate}
        date={selectedDate}
        slots={slotsForSelected}
        onClose={() => setSelectedDate(null)}
        onCreate={handleCreate}
        onToggleBlock={handleToggleBlock}
        onDelete={handleDelete}
        isHoliday={Boolean(selectedDate && venueHolidays.includes(format(selectedDate, 'yyyy-MM-dd')))}
        spaces={capacityItems}
      />

      <RecurringAvailabilityDialog
        open={recurringOpen}
        onClose={() => setRecurringOpen(false)}
        venueId={venueId}
        settings={venue?.settings}
        capacityItems={capacityItems}
        venueCapacity={venue?.capacity ?? 0}
        onDone={async () => {
          await refetch();
        }}
      />
    </Stack>
  );
}
