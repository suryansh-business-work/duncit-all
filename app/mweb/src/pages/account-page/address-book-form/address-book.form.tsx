import { useEffect } from 'react';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { blankAddressValues, type AddressFormValues } from './address-book.types';
import { useTranslation } from '../../../i18n/useTranslation';

/** Validation for a saved address — mirrors the server's addressBook rules. */
export const addressSchema = z.object({
  label: z.string().trim().min(1, 'Give this address a label').max(60),
  name: z.string().trim().max(120),
  phone: z.string().trim().max(20),
  line1: z.string().trim().min(1, 'Address line 1 is required').max(200),
  line2: z.string().trim().max(200),
  landmark: z.string().trim().max(160),
  city: z.string().trim().min(1, 'City is required').max(120),
  state: z.string().trim().min(1, 'State is required').max(120),
  pincode: z.string().trim().regex(/^\d{4,10}$/, 'Enter a valid pincode'),
  country: z.string().trim().max(80),
  is_default: z.boolean(),
});

interface Props {
  open: boolean;
  title: string;
  initial?: AddressFormValues | null;
  saving?: boolean;
  onCancel: () => void;
  onSubmit: (values: AddressFormValues) => void;
}

/** Add/edit dialog for one saved address (React Hook Form + Zod). */
export default function AddressForm({
  open,
  title,
  initial,
  saving = false,
  onCancel,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  // A new address opens with a suggested label the user can overwrite.
  const blank = { ...blankAddressValues, label: t('mweb.account.addressLabelDefault') };
  const { control, handleSubmit, reset } = useForm<AddressFormValues>({
    defaultValues: initial ?? blank,
    resolver: zodResolver(addressSchema),
    mode: 'onTouched',
  });

  useEffect(() => {
    if (open) reset(initial ?? blank);
  }, [open, initial, reset]);

  const field = (
    name: keyof AddressFormValues,
    label: string,
    extra: Record<string, unknown> = {},
  ) => (
    <Controller
      name={name}
      control={control}
      render={({ field: f, fieldState }) => (
        <TextField
          {...f}
          size="small"
          label={label}
          error={!!fieldState.error}
          helperText={fieldState.error?.message}
          fullWidth
          {...extra}
        />
      )}
    />
  );

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          {field('label', t('mweb.address.labelHomeOffice'))}
          {field('name', t('mweb.address.receiverName'))}
          {field('phone', t('mweb.address.phone'))}
          {field('line1', t('mweb.address.addressLine1'))}
          {field('line2', t('mweb.address.addressLine2'))}
          {field('landmark', t('mweb.address.landmark'))}
          <Stack direction="row" spacing={1.5}>
            {field('city', t('mweb.address.city'))}
            {field('state', t('mweb.address.state'))}
          </Stack>
          <Stack direction="row" spacing={1.5}>
            {field('pincode', t('mweb.address.pincode'))}
            {field('country', t('mweb.address.country'))}
          </Stack>
          <Controller
            name="is_default"
            control={control}
            render={({ field: f }) => (
              <FormControlLabel
                control={<Checkbox checked={f.value} onChange={(e) => f.onChange(e.target.checked)} />}
                label={t('mweb.address.useAsMyDefaultAddress')}
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onCancel} disabled={saving}>
          Cancel
        </DuncitButton>
        <DuncitButton variant="contained" onClick={handleSubmit(onSubmit)} disabled={saving} sx={{ fontWeight: 600 }}>
          Save address
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
