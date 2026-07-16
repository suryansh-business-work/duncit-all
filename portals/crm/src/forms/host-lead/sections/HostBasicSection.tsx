import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import SelectField from '../../fields/SelectField';
import FieldGrid from '../../fields/FieldGrid';
import SuperCategoryField from '../../fields/SuperCategoryField';
import CategorySelectors from '../../fields/CategorySelectors';
import { LocationFieldset } from '../../fields/LocationField';
import type { CrmOptionGroup } from '../../../api/crm.types';

export default function HostBasicSection({ config }: Readonly<{ config: CrmOptionGroup }>) {
  return (
    <Stack spacing={1.5}>
      <SuperCategoryField
        name="super_category_id"
        label="Super Category"
        required
        hint="Which super category is this host being added under? Managed via admin."
      />
      <CategorySelectors />
      <FieldGrid>
        <FormField name="host_name" label="Host Name" required size="small" />
        <SelectField name="host_type" label="Host Type" options={config.host_types} />
      </FieldGrid>
      <FormField name="organization_name" label="Organization / Community Name" size="small" />
      <LocationFieldset />
    </Stack>
  );
}
