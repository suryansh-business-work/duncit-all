import { Stack } from '@mui/material';
import ContactsField from '../../fields/ContactsField';

export default function EcommContactsSection() {
  return (
    <Stack spacing={1.5}>
      <ContactsField name="contacts" />
    </Stack>
  );
}
