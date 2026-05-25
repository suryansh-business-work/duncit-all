import { Stack } from '@mui/material';
import FormField from '../../FormField';
import ContactsField from '../../fields/ContactsField';
import FieldGrid from '../../fields/FieldGrid';

export default function HostContactsSection() {
  return (
    <Stack spacing={1.5}>
      <FieldGrid>
        <FormField name="city" label="City" size="small" />
        <FormField name="area" label="Area / Locality" size="small" />
      </FieldGrid>
      <ContactsField name="contacts" />
    </Stack>
  );
}
