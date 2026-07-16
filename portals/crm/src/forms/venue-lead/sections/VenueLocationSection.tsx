import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import FieldGrid from '../../fields/FieldGrid';
import { LocationFieldset } from '../../fields/LocationField';

export default function VenueLocationSection() {
  return (
    <Stack spacing={1.5}>
      <LocationFieldset required />
      <FormField name="full_address" label="Full Address" required size="small" multiline minRows={2} />
      <FieldGrid>
        <FormField name="landmark" label="Landmark" size="small" />
        <FormField name="map_link" label="Google Maps Link / Coordinates" size="small" />
      </FieldGrid>
    </Stack>
  );
}
