import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import MultiSelectField from '../../fields/MultiSelectField';
import SwitchField from '../../fields/SwitchField';
import FieldGrid from '../../fields/FieldGrid';
import type { CrmOptionGroup } from '../../../api/crm.types';
import { useTranslation } from '@duncit/shell';

export default function VenueCommercialSection({ config }: Readonly<{ config: CrmOptionGroup }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <MultiSelectField name="pricing_models" label={t('crm.forms.pricingModel')} options={config.pricing_models} />
      <FieldGrid>
        <FormField name="expected_charges" label={t('crm.forms.expectedCharges')} size="small" slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
        <FormField name="security_deposit" label={t('crm.forms.securityDeposit')} size="small" slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
      </FieldGrid>
      <FieldGrid>
        <SwitchField name="gst_applicable" label={t('crm.forms.gstApplicable')} />
        <SwitchField name="invoice_available" label={t('crm.forms.invoiceAvailable')} />
      </FieldGrid>
    </Stack>
  );
}
