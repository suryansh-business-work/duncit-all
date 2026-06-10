import { Stack } from '@mui/material';
import FormField from '../../FormField';
import FieldGrid from '../../fields/FieldGrid';
import { AreaField, CityField } from '../../fields/LocationField';

export default function VenueLocationSection() {
  return (
    <Stack spacing={1.5}>
      <FieldGrid>
        <CityField name="city" label="City" required />
        <AreaField name="area" cityField="city" label="Area / Locality" />
      </FieldGrid>
      <FormField name="full_address" label="Full Address" required size="small" multiline minRows={2} />
      <FieldGrid>
        <FormField name="landmark" label="Landmark" size="small" />
        <FormField name="map_link" label="Google Maps Link / Coordinates" size="small" />
      </FieldGrid>
    </Stack>
  );
}
