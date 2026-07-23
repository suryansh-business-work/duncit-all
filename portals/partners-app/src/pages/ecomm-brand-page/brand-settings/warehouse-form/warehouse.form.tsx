import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button, FormControlLabel, Stack, Switch } from '@mui/material';
import { RhfTextField, zodRules } from '@duncit/forms';
import { emptyWarehouseValues, type WarehouseFormValues } from './warehouse.types';

export const warehouseSchema = z.object({
  nickname: zodRules.requiredText('Warehouse name', 2, 60),
  contact_name: zodRules.requiredText('Contact name', 2, 80),
  phone: zodRules.phoneNumber('Phone'),
  email: zodRules.email('Email'),
  address_line1: zodRules.requiredText('Address line 1', 3, 160),
  address_line2: zodRules.optionalText('Address line 2', 160),
  city: zodRules.requiredText('City', 2, 80),
  state: zodRules.requiredText('State', 2, 80),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
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
  const { control, handleSubmit, reset } = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema),
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
        label="Warehouse name"
        required
        hint="A short unique nickname, e.g. 'Delhi warehouse'."
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField control={control} name="contact_name" label="Contact name" required />
        <RhfTextField
          control={control}
          name="phone"
          label="Phone"
          required
          inputProps={{ inputMode: 'numeric' }}
          hint="Digits only, for courier pickup coordination."
        />
      </Stack>
      <RhfTextField control={control} name="email" label="Email" type="email" required />
      <RhfTextField control={control} name="address_line1" label="Address line 1" required />
      <RhfTextField control={control} name="address_line2" label="Address line 2" />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField control={control} name="city" label="City" required />
        <RhfTextField control={control} name="state" label="State" required />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField
          control={control}
          name="pincode"
          label="Pincode"
          required
          inputProps={{ inputMode: 'numeric', maxLength: 6 }}
        />
        <RhfTextField control={control} name="country" label="Country" required />
      </Stack>
      <Controller
        control={control}
        name="is_default"
        render={({ field }) => (
          <FormControlLabel
            control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
            label="Use as the default warehouse for this brand"
          />
        )}
      />
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={busy}>
          {busy ? 'Saving...' : 'Save warehouse'}
        </Button>
      </Stack>
    </Stack>
  );
}
