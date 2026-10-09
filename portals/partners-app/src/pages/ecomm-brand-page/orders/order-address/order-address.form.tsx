import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { makeOrderAddressSchema, type OrderAddressValues } from './order-address.types';

interface Props {
  defaultValues: OrderAddressValues;
  busy: boolean;
  onSubmit: (values: OrderAddressValues) => void;
  onCancel: () => void;
}

/** Correct where an order ships to — before ShipRocket has it. */
export default function OrderAddressForm({ defaultValues, busy, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeOrderAddressSchema(t), [t]);
  const { control, handleSubmit } = useForm<OrderAddressValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onBlur',
  });
  const row = { xs: 'column', sm: 'row' } as const;

  return (
    <Stack spacing={2} component="form" onSubmit={handleSubmit(onSubmit)} noValidate data-testid="order-address-form">
      <Stack direction={row} spacing={2}>
        <RhfTextField control={control} name="name" label={t('partners.orders.address.name')} required />
        <RhfTextField
          control={control}
          name="phone"
          label={t('shell.common.phone')}
          required
          slotProps={{ htmlInput: { inputMode: 'tel' } }}
        />
      </Stack>
      <RhfTextField control={control} name="email" label={t('shell.common.email')} type="email" />
      <RhfTextField control={control} name="line1" label={t('partners.common.addressLine1')} required />
      <RhfTextField control={control} name="line2" label={t('partners.common.addressLine2')} />
      <RhfTextField control={control} name="landmark" label={t('partners.orders.address.landmark')} />
      <Stack direction={row} spacing={2}>
        <RhfTextField control={control} name="city" label={t('partners.common.city')} required />
        <RhfTextField control={control} name="state" label={t('partners.ecommBrandPage.state')} required />
      </Stack>
      <Stack direction={row} spacing={2}>
        <RhfTextField
          control={control}
          name="pincode"
          label={t('partners.ecommBrandPage.pincode')}
          required
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        />
        <RhfTextField control={control} name="country" label={t('partners.ecommBrandPage.country')} />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton onClick={onCancel} disabled={busy}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" loading={busy} data-testid="order-address-submit">
          {t('partners.orders.address.save')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
