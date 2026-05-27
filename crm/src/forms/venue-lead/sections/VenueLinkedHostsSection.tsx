import { Stack } from '@mui/material';
import LinkedHostsField from '../../fields/LinkedHostsField';

export default function VenueLinkedHostsSection() {
  return (
    <Stack spacing={1.5}>
      <LinkedHostsField name="linked_host_ids" />
    </Stack>
  );
}
