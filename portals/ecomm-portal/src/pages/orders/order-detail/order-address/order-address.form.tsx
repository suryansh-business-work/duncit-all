import { Alert, Box, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import FormDialog from '../../../../components/FormDialog';
import { useSchemaForm } from '../../../../components/form/useSchemaForm';
import type { OrderAddress } from '../../queries';
import type { ShippingAddressInput } from '../../shipping-queries';
import { addressDefaults, makeOrderAddressSchema, toAddressInput, type OrderAddressValues } from './order-address.types';

interface OrderAddressFormProps {
  address: OrderAddress | null;
  /** What the courier would refuse today, from the server's own check. */
  problems: string[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: ShippingAddressInput) => Promise<boolean>;
}

type FieldName = keyof OrderAddressValues;

const FIELDS: { name: FieldName; labelKey: string; wide?: boolean; autoComplete: string }[] = [
  { name: 'name', labelKey: 'ecommPortal.shipping.addressName', autoComplete: 'name' },
  { name: 'phone', labelKey: 'ecommPortal.shipping.addressPhone', autoComplete: 'tel-national' },
  { name: 'line1', labelKey: 'ecommPortal.shipping.addressLine1', wide: true, autoComplete: 'address-line1' },
  { name: 'line2', labelKey: 'ecommPortal.shipping.addressLine2', wide: true, autoComplete: 'address-line2' },
  { name: 'landmark', labelKey: 'ecommPortal.shipping.addressLandmark', autoComplete: 'off' },
  { name: 'pincode', labelKey: 'ecommPortal.shipping.addressPincode', autoComplete: 'postal-code' },
  { name: 'city', labelKey: 'ecommPortal.shipping.addressCity', autoComplete: 'address-level2' },
  { name: 'state', labelKey: 'ecommPortal.shipping.addressState', autoComplete: 'address-level1' },
];

/**
 * Correct the ship-to address before the shipment is booked — the rescue for
 * an order placed with a placeholder street ("India") the courier refuses.
 */
export default function OrderAddressForm({ address, problems, busy, onClose, onSubmit }: Readonly<OrderAddressFormProps>) {
  const { t, form } = useSchemaForm<OrderAddressValues>(makeOrderAddressSchema, addressDefaults(address));
  const { control, handleSubmit } = form;
  const submit = handleSubmit(async (values) => {
    if (await onSubmit(toAddressInput(values))) onClose();
  });
  return (
    <FormDialog formId="order-address-form" title={t('ecommPortal.shipping.addressTitle')} busy={busy} onClose={onClose} onSubmit={submit} submitLabel={t('ecommPortal.shipping.saveAddress')} maxWidth="md">
      <Stack spacing={2}>
        {problems.length > 0 ? (
          <Alert severity="warning">{t('ecommPortal.shipping.addressNeeds', { vars: { needs: problems.join(', ') } })}</Alert>
        ) : null}
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          {FIELDS.map((field) => (
            <Box key={field.name} sx={{ gridColumn: field.wide ? '1 / -1' : 'auto' }}>
              <RhfTextField
                control={control}
                name={field.name}
                label={t(field.labelKey)}
                autoComplete={field.autoComplete}
                required={field.name !== 'line2' && field.name !== 'landmark'}
              />
            </Box>
          ))}
        </Box>
      </Stack>
    </FormDialog>
  );
}
