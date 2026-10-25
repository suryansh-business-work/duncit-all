import { Box, Stack } from '@mui/material';
import VenueHoursCard from './VenueHoursCard';
import VenueRulesCard from './VenueRulesCard';
import VenueCancellationCard from './VenueCancellationCard';
import VenueOffersCard from './VenueOffersCard';
import type { AdminVenueDetail, VenueSettings } from './queries';

interface Props {
  settings: VenueSettings;
  /** The booking-offer terms in effect, read off the venue itself; absent on an older record. */
  venue?: Pick<AdminVenueDetail, 'offer_min_guests' | 'offer_response_hours'>;
}

/** How the venue takes bookings — the settings its owner maintains in the
 * Partners console, read back here so an admin never has to log in as them. */
export default function VenueOperationsTab({ settings, venue }: Readonly<Props>) {
  const minGuests = venue?.offer_min_guests;
  const responseHours = venue?.offer_response_hours;
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2.5,
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        alignItems: 'start',
      }}
    >
      <Stack spacing={2.5} sx={{ minWidth: 0 }}>
        <VenueHoursCard settings={settings} />
        <VenueCancellationCard settings={settings} />
      </Stack>
      <Stack spacing={2.5} sx={{ minWidth: 0 }}>
        <VenueRulesCard settings={settings} />
        {minGuests !== undefined && responseHours !== undefined && (
          <VenueOffersCard
            own={settings.offers}
            effective={{ min_guests: minGuests, response_hours: responseHours }}
          />
        )}
      </Stack>
    </Box>
  );
}
