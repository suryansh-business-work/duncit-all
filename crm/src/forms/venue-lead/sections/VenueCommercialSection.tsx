import { Stack } from '@mui/material';
import FormField from '../../FormField';
import MultiSelectField from '../../fields/MultiSelectField';
import SwitchField from '../../fields/SwitchField';
import FieldGrid from '../../fields/FieldGrid';
import type { CrmOptionGroup } from '../../../api/crm.types';

export default function VenueCommercialSection({ config }: { config: CrmOptionGroup }) {
  return (
    <Stack spacing={1.5}>
      <MultiSelectField name="pricing_models" label="Pricing Model" options={config.pricing_models} />
      <FieldGrid>
        <FormField name="expected_charges" label="Expected Charges (₹)" size="small" inputProps={{ inputMode: 'numeric' }} />
        <FormField name="security_deposit" label="Security Deposit (₹)" size="small" inputProps={{ inputMode: 'numeric' }} />
      </FieldGrid>
      <FieldGrid>
        <SwitchField name="gst_applicable" label="GST Applicable" />
        <SwitchField name="invoice_available" label="Invoice Available" />
      </FieldGrid>
    </Stack>
  );
}
