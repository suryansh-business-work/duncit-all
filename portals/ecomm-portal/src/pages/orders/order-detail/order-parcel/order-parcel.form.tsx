import { Alert, Stack } from '@mui/material';
import { PackagingFields } from '@duncit/forms';
import FormDialog from '../../../../components/FormDialog';
import { useSchemaForm } from '../../../../components/form/useSchemaForm';
import type { OrderParcel, ParcelInput } from '../../shipping-queries';
import { makeOrderParcelSchema, parcelDefaults, toParcelInput, type OrderParcelValues } from './order-parcel.types';

interface OrderParcelFormProps {
  parcel: OrderParcel;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: ParcelInput) => Promise<boolean>;
}

/**
 * Correct the parcel before the shipment is booked — a box the packer changed,
 * two items that went in one bag. What is saved here is what ShipRocket is told,
 * and what a weight dispute is checked against later.
 */
export default function OrderParcelForm({ parcel, busy, onClose, onSubmit }: Readonly<OrderParcelFormProps>) {
  const { t, form } = useSchemaForm<OrderParcelValues>(makeOrderParcelSchema, parcelDefaults(parcel));
  const { control, setValue, handleSubmit } = form;
  const submit = handleSubmit(async (values) => {
    if (await onSubmit(toParcelInput(values))) onClose();
  });
  return (
    <FormDialog
      formId="order-parcel-form"
      title={t('ecommPortal.shipping.parcelTitle')}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={t('ecommPortal.shipping.saveParcel')}
      maxWidth="md"
    >
      <Stack spacing={2}>
        <Alert severity="info">{t('ecommPortal.shipping.parcelHint')}</Alert>
        <PackagingFields control={control} setValue={setValue} t={t} productFields={false} required />
      </Stack>
    </FormDialog>
  );
}
