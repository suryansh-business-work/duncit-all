import { Stack } from '@mui/material';
import FormField from '../../FormField';
import SelectField from '../../fields/SelectField';
import MultiSelectField from '../../fields/MultiSelectField';
import FieldGrid from '../../fields/FieldGrid';
import type { CrmOptionGroup } from '../../../api/crm.types';

export default function VenueAvailabilitySection({ config }: { config: CrmOptionGroup }) {
  return (
    <Stack spacing={1.5}>
      <MultiSelectField name="available_days" label="Available Days" options={config.week_days} />
      <FieldGrid>
        <FormField name="available_time_slots" label="Available Time Slots" size="small" />
        <SelectField name="booking_notice" label="Booking Notice Required" options={config.booking_notices} />
      </FieldGrid>
    </Stack>
  );
}
