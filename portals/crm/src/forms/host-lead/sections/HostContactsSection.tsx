import { Stack } from '@mui/material';
import ContactsField from '../../fields/ContactsField';

/**
 * City + area now live in HostBasicSection so they don't appear twice
 * — this section is purely the contacts array.
 */
export default function HostContactsSection() {
  return (
    <Stack spacing={1.5}>
      <ContactsField name="contacts" />
    </Stack>
  );
}
