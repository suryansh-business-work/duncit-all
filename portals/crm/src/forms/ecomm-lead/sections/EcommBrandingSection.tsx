import { Stack } from '@mui/material';
import ImageUploadField from '../../fields/ImageUploadField';
import TagsField from '../../fields/TagsField';
import DynamicFieldsRenderer from '../../fields/DynamicFieldsRenderer';

export default function EcommBrandingSection() {
  return (
    <Stack spacing={1.75}>
      <ImageUploadField
        name="profile_photo_url"
        label="Brand / seller photo"
        shape="circle"
        folder="crm/ecomm-photos"
        helperText="Optional. PNG/JPG up to 8MB."
      />
      <TagsField name="tags" label="Tags / labels" helperText="Optional — free-text labels for filtering and grouping." />
      <DynamicFieldsRenderer entity="ECOMM_LEAD" name="dynamic_values_json" />
    </Stack>
  );
}
