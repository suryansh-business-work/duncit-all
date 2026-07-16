import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import MediaUploadField from '../../fields/MediaUploadField';

export default function VenueMediaSection() {
  return (
    <Stack spacing={2}>
      <MediaUploadField
        name="photos"
        label="Venue Photos"
        kind="image"
        folder="crm/venue-photos"
        helperText="Upload to ImageKit — JPG/PNG up to 8MB each. Multiple allowed."
      />
      <MediaUploadField
        name="videos"
        label="Venue Videos"
        kind="video"
        folder="crm/venue-videos"
        helperText="Upload to ImageKit — MP4 up to 100MB each. Multiple allowed."
      />
      <FormField name="brochure_url" label="Brochure / Rate Card URL" size="small" />
    </Stack>
  );
}
