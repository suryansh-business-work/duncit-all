import { MenuItem, Stack, TextField, Typography } from '@mui/material';
import { canSwitchVenues, pickVenue, venueLabel, venueSubLabel, type SwitchableVenue } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface VenueSwitcherProps {
  venues: SwitchableVenue[];
  venueId: string | null;
  onChange: (venueId: string) => void;
}

/**
 * "Switch your venue" — the control a partner with more than one venue never
 * had. Everything below it on the page (capacity, status, bookings, health,
 * application) belongs to the venue picked here.
 *
 * Hidden for a single venue: there is nothing to switch to, and an empty
 * dropdown reads as a missing venue.
 */
export default function VenueSwitcher({ venues, venueId, onChange }: Readonly<VenueSwitcherProps>) {
  const { t } = useTranslation();
  const untitled = t('mweb.venueManagePage.untitledVenue');

  if (!canSwitchVenues(venues)) return null;

  return (
    <TextField
      select
      fullWidth
      size="small"
      label={t('mweb.venueManagePage.switchYourVenue')}
      value={pickVenue(venues, venueId)?.id ?? ''}
      onChange={(event) => onChange(event.target.value)}
      data-testid="venue-switcher"
      slotProps={{
        select: {
          renderValue: (value) =>
            venueLabel(
              venues.find((venue) => venue.id === String(value)),
              untitled
            ),
        },
      }}
      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '16px', fontWeight: 700 } }}
    >
      {venues.map((venue) => (
        <MenuItem key={venue.id} value={venue.id}>
          <Stack spacing={0.15} sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
              {venueLabel(venue, untitled)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
              {venueSubLabel(venue)}
            </Typography>
          </Stack>
        </MenuItem>
      ))}
    </TextField>
  );
}
