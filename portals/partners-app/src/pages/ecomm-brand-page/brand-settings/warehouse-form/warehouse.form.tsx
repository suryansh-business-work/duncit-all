import { useEffect } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, FormControlLabel, Stack, Switch } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField, zodRules } from '@duncit/forms';
import { PHONE_NUMBER_IN, PINCODE, toDigits } from '@duncit/regex';
import { emptyWarehouseValues, type WarehouseFormValues } from './warehouse.types';
import { useTranslation } from '@duncit/shell';

/**
 * A warehouse is a ShipRocket pickup address, so the form asks for exactly what
 * ShipRocket's own "add pickup address" does and refuses what it would: a name
 * of at most 36 characters, a ten-digit mobile, a street line of at least ten
 * characters and a six-digit PIN. The server holds a save to the same rules.
 */
export const warehouseSchema = z.object({
  nickname: zodRules.requiredText('Warehouse name', 2, 36),
  contact_name: zodRules.requiredText('Contact name', 2, 80),
  phone: z
    .string()
    .trim()
    .refine((value) => PHONE_NUMBER_IN.test(toDigits(value).slice(-10)), 'Phone must be a valid 10-digit mobile number'),
  email: zodRules.email('Email'),
  address_line1: zodRules.requiredText('Address line 1', 10, 160),
  address_line2: zodRules.optionalText('Address line 2', 160),
  city: zodRules.requiredText('City', 3, 80),
  state: zodRules.requiredText('State', 2, 80),
  pincode: z.string().trim().regex(PINCODE, 'Enter a valid 6-digit pincode'),
  country: zodRules.requiredText('Country', 2, 60),
  is_default: z.boolean(),
});

interface Props {
  defaultValues: WarehouseFormValues;
  busy: boolean;
  apiError?: string | null;
  onSave: (values: WarehouseFormValues) => void;
  onCancel: () => void;
}

/** Add/edit one brand warehouse. Nicknames are unique per brand — the server
 * CONFLICT error is surfaced via apiError. */
export default function WarehouseForm({ defaultValues, busy, apiError = null, onSave, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset } = useForm<WarehouseFormValues, any, WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema) as unknown as Resolver<WarehouseFormValues, any, WarehouseFormValues>,
    defaultValues: defaultValues ?? emptyWarehouseValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <Stack spacing={2} component="form" onSubmit={handleSubmit(onSave)}>
      {apiError && <Alert severity="error">{apiError}</Alert>}
      <RhfTextField
        control={control}
        name="nickname"
        label={t('partners.ecommBrandPage.warehouseName')}
        required
        hint={t('partners.warehouses.nicknameHint')}
        slotProps={{ htmlInput: { maxLength: 36 } }}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField control={control} name="contact_name" label={t('partners.ecommBrandPage.contactName')} required />
        <RhfTextField
          control={control}
          name="phone"
          label={t('shell.common.phone')}
          required
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          hint={t('partners.warehouses.phoneHint')}
        />
      </Stack>
      <RhfTextField control={control} name="email" label={t('shell.common.email')} type="email" required />
      <RhfTextField
        control={control}
        name="address_line1"
        label={t('partners.common.addressLine1')}
        required
        hint={t('partners.warehouses.addressHint')}
      />
      <RhfTextField control={control} name="address_line2" label={t('partners.common.addressLine2')} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField control={control} name="city" label={t('partners.common.city')} required />
        <RhfTextField control={control} name="state" label={t('partners.ecommBrandPage.state')} required />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField
          control={control}
          name="pincode"
          label={t('partners.ecommBrandPage.pincode')}
          required
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6 } }}
        />
        <RhfTextField control={control} name="country" label={t('partners.ecommBrandPage.country')} required />
      </Stack>
      <Controller
        control={control}
        name="is_default"
        render={({ field }) => (
          <FormControlLabel
            control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
            label={t('partners.ecommBrandPage.useAsTheDefaultWarehouseFor')}
          />
        )}
      />
      <Stack direction="row" spacing={1} sx={{
        justifyContent: "flex-end"
      }}>
        <DuncitButton onClick={onCancel} disabled={busy}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" loading={busy}>
          {busy ? 'Saving...' : 'Save warehouse'}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
