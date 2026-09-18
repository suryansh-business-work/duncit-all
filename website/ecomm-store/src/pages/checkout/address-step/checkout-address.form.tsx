import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Checkbox, FormControlLabel, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';

import { AddressFields, type AddressValues } from '../../../components/address-form';
import { useStoreT } from '../../../i18n';
import { makeCheckoutAddressSchema, type CheckoutAddressValues } from './checkout-address.types';

interface CheckoutAddressFormProps {
  initial: AddressValues;
  /** Signed in: offer "save to my address book". */
  canSave: boolean;
  onDone: (values: CheckoutAddressValues) => void | Promise<void>;
}

/** A new delivery address, with a 6-digit pincode and a 10-digit phone. */
export function CheckoutAddressForm({ initial, canSave, onDone }: Readonly<CheckoutAddressFormProps>) {
  const { t } = useStoreT();
  const schema = useMemo(() => makeCheckoutAddressSchema(t), [t]);
  const { control, handleSubmit, formState } = useForm<CheckoutAddressValues>({
    resolver: zodResolver(schema),
    values: { ...initial, save: canSave },
  });
  return (
    <Stack component="form" spacing={1.5} onSubmit={handleSubmit(onDone)} noValidate>
      <AddressFields control={control} />
      {canSave ? (
        <Controller
          control={control}
          name="save"
          render={({ field }) => (
            <FormControlLabel
              control={<Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />}
              label={t('ecommStore.checkout.saveAddress')}
            />
          )}
        />
      ) : null}
      <DuncitButton type="submit" variant="contained" size="large" loading={formState.isSubmitting} sx={{ alignSelf: 'flex-start' }}>
        {t('ecommStore.checkout.deliverHere')}
      </DuncitButton>
    </Stack>
  );
}
