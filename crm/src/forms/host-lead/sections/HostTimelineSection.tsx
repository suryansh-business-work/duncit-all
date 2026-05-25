import { Stack } from '@mui/material';
import FormField from '../../FormField';
import SelectField from '../../fields/SelectField';
import DateField from '../../fields/DateField';
import FieldGrid from '../../fields/FieldGrid';
import type { CrmOptionGroup } from '../../../api/crm.types';

export default function HostTimelineSection({ config }: { config: CrmOptionGroup }) {
  return (
    <FieldGrid cols={3}>
      <DateField name="preferred_event_date" label="Preferred Event Date" />
      <SelectField name="preferred_day" label="Preferred Day" options={config.week_days} />
      <Stack><FormField name="preferred_time_slot" label="Preferred Time Slot" size="small" /></Stack>
    </FieldGrid>
  );
}
