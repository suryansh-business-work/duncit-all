import VenueCalendar from './calendar/VenueCalendar';
import VenueSetupPage from './VenueSetupPage';

/** Venue Options > Calendar: the venue's bookings, blocked dates and holidays by month. */
export default function CalendarPage() {
  return (
    <VenueSetupPage titleKey="mweb.studioOptions.venueCalendar" hintKey="mweb.studioOptions.venueCalendarHint" testId="venue-calendar-page">
      {(venue, refetch) => (
        <VenueCalendar key={venue.id} venueId={venue.id} holidays={venue.settings?.holidays ?? []} onVenueChanged={refetch} />
      )}
    </VenueSetupPage>
  );
}
