import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';

export default function VenueWebsiteSection() {
  return (
    <Stack spacing={1.5}>
      <FormField
        name="website"
        label="Website"
        size="small"
        placeholder="https://example.com"
        hint="Full URL — used on the venue's public listing."
      />
    </Stack>
  );
}
