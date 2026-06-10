import { Stack } from '@mui/material';
import ImageUploadField from '../../fields/ImageUploadField';
import TagsField from '../../fields/TagsField';

export default function HostBrandingSection() {
  return (
    <Stack spacing={1.75}>
      <ImageUploadField
        name="profile_photo_url"
        label="Profile photo"
        shape="circle"
        folder="crm/host-photos"
        helperText="Optional. PNG/JPG up to 8MB."
      />
      <TagsField name="tags" label="Tags / labels" helperText="Optional — free-text labels for filtering and grouping." />
    </Stack>
  );
}
