import { Stack } from '@mui/material';
import FormField from '../../FormField';
import SelectField from '../../fields/SelectField';
import DateField from '../../fields/DateField';
import FieldGrid from '../../fields/FieldGrid';
import type { CrmOptionGroup } from '../../../api/crm.types';

export default function VenueTrackingSection({ config }: Readonly<{ config: CrmOptionGroup }>) {
  return (
    <Stack spacing={1.5}>
      <FieldGrid>
        <SelectField name="lead_source" label="Lead Source" options={config.lead_sources} />
        <FormField name="assigned_to" label="Assigned To" size="small" />
      </FieldGrid>
      <FieldGrid cols={3}>
        <SelectField name="lead_status" label="Lead Status" options={config.venue_lead_statuses} required allowEmpty={false} />
        <SelectField name="priority" label="Priority" options={config.priorities} required allowEmpty={false} />
        <DateField name="next_follow_up_date" label="Next Follow-up Date" />
      </FieldGrid>
      <FormField name="remarks" label="Remarks" size="small" multiline minRows={2} />
    </Stack>
  );
}
