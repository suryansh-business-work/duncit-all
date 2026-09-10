import { Box, Stack } from '@mui/material';
import VenueHoursCard from './VenueHoursCard';
import VenueRulesCard from './VenueRulesCard';
import VenueCancellationCard from './VenueCancellationCard';
import type { VenueSettings } from './queries';

/** How the venue takes bookings — the settings its owner maintains in the
 * Partners console, read back here so an admin never has to log in as them. */
export default function VenueOperationsTab({ settings }: Readonly<{ settings: VenueSettings }>) {
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
      <VenueRulesCard settings={settings} />
    </Box>
  );
}
