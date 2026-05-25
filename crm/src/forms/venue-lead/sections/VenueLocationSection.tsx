import { Stack } from '@mui/material';
import FormField from '../../FormField';
import FieldGrid from '../../fields/FieldGrid';

export default function VenueLocationSection() {
  return (
    <Stack spacing={1.5}>
      <FieldGrid>
        <FormField name="city" label="City" required size="small" />
        <FormField name="area" label="Area / Locality" size="small" />
      </FieldGrid>
      <FormField name="full_address" label="Full Address" required size="small" multiline minRows={2} />
      <FieldGrid>
        <FormField name="landmark" label="Landmark" size="small" />
        <FormField name="map_link" label="Google Maps Link / Coordinates" size="small" />
      </FieldGrid>
    </Stack>
  );
}
