import { Stack } from '@mui/material';
import { useField } from 'formik';
import FormField from '../../FormField';
import SelectField from '../../fields/SelectField';
import MultiSelectField from '../../fields/MultiSelectField';
import FieldGrid from '../../fields/FieldGrid';
import SuperCategoryField from '../../fields/SuperCategoryField';
import CategorySelectors from '../../fields/CategorySelectors';
import type { CrmOptionGroup } from '../../../api/crm.types';

export default function VenueDetailsSection({ config }: { config: CrmOptionGroup }) {
  const [typesField] = useField<string[]>('venue_types');
  const showOther = (typesField.value ?? []).includes('Other');
  return (
    <Stack spacing={1.5}>
      <SuperCategoryField
        name="super_category_id"
        label="Super Category"
        required
        hint="Which super category is this venue being added under? Managed via admin."
      />
      <CategorySelectors />
      <FieldGrid>
        <FormField name="venue_name" label="Venue Name" required size="small" />
        <SelectField name="space_type" label="Indoor / Outdoor / Both" options={config.space_types} />
      </FieldGrid>
      <MultiSelectField name="venue_types" label="Venue Type" options={config.venue_types} required />
      {showOther && (
        <FormField
          name="venue_type_other"
          label="Other venue type — please specify"
          required
          size="small"
          hint="You selected Other; describe the venue type."
        />
      )}
      <FormField name="venue_description" label="Venue Description" size="small" multiline minRows={2} />
      <FieldGrid>
        <FormField name="capacity_min" label="Capacity Min" size="small" inputProps={{ inputMode: 'numeric' }} />
        <FormField name="capacity_max" label="Capacity Max" size="small" inputProps={{ inputMode: 'numeric' }} />
      </FieldGrid>
    </Stack>
  );
}
