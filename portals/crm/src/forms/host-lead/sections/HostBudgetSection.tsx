import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import MultiSelectField from '../../fields/MultiSelectField';
import SwitchField from '../../fields/SwitchField';
import FieldGrid from '../../fields/FieldGrid';
import type { CrmOptionGroup } from '../../../api/crm.types';

export default function HostBudgetSection({ config }: Readonly<{ config: CrmOptionGroup }>) {
  return (
    <Stack spacing={1.5}>
      <FormField name="budget_range" label="Budget Range (₹)" size="small" />
      <MultiSelectField name="revenue_models" label="Revenue Model Preference" options={config.revenue_models} />
      <FieldGrid>
        <SwitchField name="need_venue" label="Need venue from us?" />
        <SwitchField name="need_vendor" label="Need vendor / services?" />
      </FieldGrid>
    </Stack>
  );
}
