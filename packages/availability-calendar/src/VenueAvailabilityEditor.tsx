import { useMemo, useState } from 'react';
import { Alert, Card, CardContent, CircularProgress, Stack } from '@mui/material';
import { addDays, format, startOfDay } from 'date-fns';
import { MAX_FUTURE_DAYS, readVenueSettings, slotCoversDay } from '@duncit/slots';
import AvailabilityCalendar from './AvailabilityCalendar';
import CalendarLegend from './CalendarLegend';
import CalendarToolbar from './CalendarToolbar';
import DayDrawer from './DayDrawer';
import RecurringAvailabilityDialog from './recurring/RecurringAvailabilityDialog';
import { periodLabel, shiftAnchor, viewRange } from './calendar-period';
import { useVenueSlots } from './useVenueSlots';
import type { CalendarView, VenueSlotRow, VenueSpace } from './types';

/** The venue fields the editor reads — the `myVenues` row satisfies it. */
export interface EditorVenue {
  id: string;
  venue_name?: string | null;
  status: string;
  capacity: number;
  capacity_items: VenueSpace[];
  /** The GraphQL `settings` object; read leniently, old venues carry none. */
  settings?: unknown;
}

interface Props {
  venue: EditorVenue;
  /** Fired after the dialog writes to the venue itself (rules, auto-extend),
   *  so the host can refresh whatever it derived from the venue row. */
  onVenueChanged?: () => Promise<void> | void;
}

/**
 * Space first, then time: a venue with ten courts publishes ten slots for the
 * same hour, and chronological order interleaves them into a list where no
 * court's own day is readable. A venue with no named spaces sorts by time
 * exactly as before, because every space_label is ''.
 */
function slotsOn(slots: VenueSlotRow[], day: Date | null): VenueSlotRow[] {
  if (!day) return [];
  // slotCoversDay, not isSameDay(start): a multi-day (activity) booking must
  // appear in the drawer of every day it spans.
  return slots
    .filter((s) => slotCoversDay(s, day))
    .sort((a, b) => {
      const bySpace = (a.space_label ?? '').localeCompare(b.space_label ?? '');
      if (bySpace !== 0) return bySpace;
      return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
    });
}

/**
 * The whole venue-availability surface — toolbar, calendar, legend, the day
 * drawer and the recurring dialog — with its Apollo wiring inside, so the
 * Partners console and mWeb mount one component rather than two copies of
 * the page body.
 */
export default function VenueAvailabilityEditor({ venue, onVenueChanged }: Readonly<Props>) {
  const [view, setView] = useState<CalendarView>('month');
  // Anchor on today so Day/Week views open on the current period (month view
  // derives its own startOfMonth). Anchoring on the 1st would land Day on a past date.
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [recurringOpen, setRecurringOpen] = useState(false);

  const venueHolidays = useMemo(() => readVenueSettings(venue.settings).holidays, [venue.settings]);
  // The venue's bookable spaces ("Court 1", …), which both the day drawer and
  // the recurring dialog price separately. Memoised because the recurring
  // dialog re-seeds its space rows whenever this value changes — a fresh array
  // every render would wipe the owner's prices as they typed them.
  const capacityItems = useMemo<VenueSpace[]>(
    () => venue.capacity_items.map((s) => ({ label: s.label, capacity: s.capacity })),
    [venue.capacity_items],
  );

  const range = useMemo(() => viewRange(view, anchor), [view, anchor]);
  const { slots, pending, error, refetch, create, toggleBlock, remove } = useVenueSlots(venue.id, range);

  // Main slot availability is bookable only within the next 60 days — later days
  // are non-selectable in the calendar (server + DayDrawer are the backstop),
  // and the toolbar's Next arrow disables at the window's edge.
  const maxSelectableDate = useMemo(() => addDays(startOfDay(new Date()), MAX_FUTURE_DAYS), []);
  const canGoNext = range.to < maxSelectableDate;

  const shift = (dir: 1 | -1) => setAnchor(shiftAnchor(view, anchor, dir));

  const slotsForSelected = useMemo(() => slotsOn(slots, selectedDate), [slots, selectedDate]);
  const isHolidaySelected = Boolean(selectedDate && venueHolidays.includes(format(selectedDate, 'yyyy-MM-dd')));

  const handleDialogDone = async () => {
    await refetch();
    await onVenueChanged?.();
  };

  return (
    <>
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

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error.message}
            </Alert>
          )}
          {pending ? (
            <Stack sx={{ alignItems: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Stack>
          ) : (
            <AvailabilityCalendar
              month={anchor}
              view={view}
              slots={slots}
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
        onCreate={create}
        onToggleBlock={toggleBlock}
        onDelete={remove}
        isHoliday={isHolidaySelected}
        spaces={capacityItems}
      />

      <RecurringAvailabilityDialog
        open={recurringOpen}
        onClose={() => setRecurringOpen(false)}
        venueId={venue.id}
        settings={venue.settings}
        capacityItems={capacityItems}
        venueCapacity={venue.capacity}
        onDone={handleDialogDone}
      />
    </>
  );
}
