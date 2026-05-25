import { Stack } from '@mui/material';
import FormField from '../../FormField';
import SelectField from '../../fields/SelectField';
import MultiSelectField from '../../fields/MultiSelectField';
import FieldGrid from '../../fields/FieldGrid';
import type { CrmOptionGroup } from '../../../api/crm.types';

export default function VenueDetailsSection({ config }: { config: CrmOptionGroup }) {
  return (
    <Stack spacing={1.5}>
      <FieldGrid>
        <FormField name="venue_name" label="Venue Name" required size="small" />
        <SelectField name="space_type" label="Indoor / Outdoor / Both" options={config.space_types} />
      </FieldGrid>
      <MultiSelectField name="venue_types" label="Venue Type" options={config.venue_types} required />
      <FormField name="venue_description" label="Venue Description" size="small" multiline minRows={2} />
      <FieldGrid>
        <FormField name="capacity_min" label="Capacity Min" size="small" inputProps={{ inputMode: 'numeric' }} />
        <FormField name="capacity_max" label="Capacity Max" size="small" inputProps={{ inputMode: 'numeric' }} />
      </FieldGrid>
    </Stack>
  );
}
