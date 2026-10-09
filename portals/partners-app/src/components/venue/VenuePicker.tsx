import { MenuItem, TextField } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { venueLabel, venueSubLabel, type SwitchableVenue } from '@duncit/utils';

interface Props {
  venues: readonly SwitchableVenue[];
  value: string | null;
  onChange: (venueId: string) => void;
  /** The line under the select — e.g. "Every venue option opens for this venue". */
  helperText?: string;
  testId?: string;
}

/**
 * The venue select at the top of a Venue Studio page. Picking one here
 * remembers it (see useSelectedVenue), so every venue option opens on it.
 */
export default function VenuePicker({ venues, value, onChange, helperText, testId = 'venue-picker' }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <TextField
      select
      fullWidth
      size="small"
      label={t('mweb.studioOptions.selectedVenue')}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      helperText={helperText}
      slotProps={{ htmlInput: { 'data-testid': testId } }}
    >
      {venues.map((venue) => (
        <MenuItem key={venue.id} value={venue.id}>
          {venueLabel(venue, t('mweb.venueManagePage.untitledVenue'))}
          {venueSubLabel(venue) ? ` · ${venueSubLabel(venue)}` : ''}
        </MenuItem>
      ))}
    </TextField>
  );
}
