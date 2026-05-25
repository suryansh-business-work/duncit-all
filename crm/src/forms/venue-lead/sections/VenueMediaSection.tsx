import { Stack } from '@mui/material';
import FormField from '../../FormField';

export default function VenueMediaSection() {
  return (
    <Stack spacing={1.5}>
      <FormField name="photos" label="Venue Photos (one URL per line)" size="small" multiline minRows={2} hint="Paste image URLs, one per line." />
      <FormField name="videos" label="Videos (one URL per line)" size="small" multiline minRows={2} hint="Paste video URLs, one per line." />
      <FormField name="brochure_url" label="Brochure / Rate Card URL" size="small" />
    </Stack>
  );
}
