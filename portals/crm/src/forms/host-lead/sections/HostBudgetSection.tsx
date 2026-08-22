import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import MultiSelectField from '../../fields/MultiSelectField';
import SwitchField from '../../fields/SwitchField';
import FieldGrid from '../../fields/FieldGrid';
import type { CrmOptionGroup } from '../../../api/crm.types';
import { useTranslation } from '@duncit/shell';

export default function HostBudgetSection({ config }: Readonly<{ config: CrmOptionGroup }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <FormField name="budget_range" label={t('crm.forms.budgetRange')} size="small" />
      <MultiSelectField name="revenue_models" label={t('crm.forms.revenueModelPreference')} options={config.revenue_models} />
      <FieldGrid>
        <SwitchField name="need_venue" label={t('crm.forms.needVenueFromUs')} />
        <SwitchField name="need_vendor" label={t('crm.forms.needVendorServices')} />
      </FieldGrid>
    </Stack>
  );
}
