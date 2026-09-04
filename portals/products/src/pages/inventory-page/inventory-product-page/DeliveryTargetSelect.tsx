import { MenuItem, TextField } from '@mui/material';
import { useController, useFormContext } from 'react-hook-form';
import { useTranslation } from '@duncit/shell';
import { DELIVERY_TARGET_OPTIONS } from '../../ecomm/deliveryTarget';
import type { InventoryProductFormValues } from './types';

/** How this product reaches the buyer. SHIPROCKET is the switch that puts it on
 * the shipping engine: only then does the checkout rate the parcel live from the
 * warehouse pincode below and book a courier on payment. HOST/VENUE products are
 * hand-carried at the pod and are never quoted.
 *
 * No error slot: the field can only ever hold one of the options it renders, so
 * the schema's enum has nothing left to reject. */
export default function DeliveryTargetSelect() {
  const { t } = useTranslation();
  const { control } = useFormContext<InventoryProductFormValues>();
  const { field } = useController({ control, name: 'delivery_target' });

  return (
    <TextField
      select
      fullWidth
      required
      label={t('products.delivery.target')}
      value={field.value}
      onChange={(event) => field.onChange(event.target.value)}
      onBlur={field.onBlur}
      inputRef={field.ref}
      helperText={t('products.delivery.targetHint')}
    >
      {DELIVERY_TARGET_OPTIONS.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
