import { Stack } from '@mui/material';
import ImageUploadField from '../../fields/ImageUploadField';
import TagsField from '../../fields/TagsField';

export default function VenueBrandingSection() {
  return (
    <Stack spacing={1.75}>
      <ImageUploadField
        name="logo_url"
        label="Venue logo"
        shape="square"
        folder="crm/venue-logos"
        helperText="Optional. PNG/JPG up to 8MB."
      />
      <TagsField name="tags" label="Tags / labels" helperText="Optional — free-text labels for filtering and grouping." />
    </Stack>
  );
}
