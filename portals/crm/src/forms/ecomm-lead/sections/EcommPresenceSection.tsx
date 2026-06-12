import { Stack } from '@mui/material';
import FormField from '../../FormField';
import FieldGrid from '../../fields/FieldGrid';
import SwitchField from '../../fields/SwitchField';
import TagsField from '../../fields/TagsField';

export default function EcommPresenceSection() {
  return (
    <Stack spacing={1.5}>
      <FieldGrid>
        <FormField name="gst_number" label="GST Number" size="small" />
        <SwitchField name="gst_applicable" label="GST applicable" />
      </FieldGrid>
      <FieldGrid>
        <FormField name="website" label="Website" size="small" placeholder="https://example.com" />
        <FormField name="instagram_link" label="Instagram" size="small" placeholder="https://instagram.com/…" />
      </FieldGrid>
      <TagsField
        name="marketplace_links"
        label="Marketplace links"
        helperText="Amazon / Flipkart / Meesho store links. Press Enter to add."
      />
    </Stack>
  );
}
