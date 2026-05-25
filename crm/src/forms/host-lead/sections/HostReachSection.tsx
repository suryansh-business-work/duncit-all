import { Stack } from '@mui/material';
import FormField from '../../FormField';
import SwitchField from '../../fields/SwitchField';
import FieldGrid from '../../fields/FieldGrid';

export default function HostReachSection() {
  return (
    <Stack spacing={1.5}>
      <FieldGrid>
        <FormField name="instagram_link" label="Instagram / Social Link" size="small" />
        <FormField name="community_link" label="WhatsApp Community / Group Link" size="small" />
      </FieldGrid>
      <FieldGrid cols={3}>
        <FormField name="community_size" label="Community Size" size="small" inputProps={{ inputMode: 'numeric' }} />
        <FormField name="past_attendees" label="Approx Past Attendees" size="small" inputProps={{ inputMode: 'numeric' }} />
        <SwitchField name="previous_events_hosted" label="Previous Events Hosted?" />
      </FieldGrid>
    </Stack>
  );
}
