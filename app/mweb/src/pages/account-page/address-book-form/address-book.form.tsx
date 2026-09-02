import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { makeAddressSchema as makeSharedAddressSchema } from '@duncit/forms/schemas';
import { blankAddressValues, type AddressFormValues } from './address-book.types';
import { fallbackT, type Translate } from '../../../i18n/fallback';
import { useTranslation } from '../../../i18n/useTranslation';

/**
 * One saved address, plus the flag only mWeb offers.
 *
 * The rules themselves are @duncit/forms' `makeAddressSchema` — the native
 * sheet renders the same ones, so a parcel refused on one app is refused on the
 * other (rules 27 and 40). Every shape behind them is @duncit/regex's.
 */
export const makeAddressSchema = (t: Translate = fallbackT) =>
  makeSharedAddressSchema(t).extend({ is_default: z.boolean() });

export const addressSchema = makeAddressSchema();

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
  const schema = useMemo(() => makeAddressSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<AddressFormValues, any, AddressFormValues>({
    defaultValues: initial ?? blank,
    resolver: zodResolver(schema) as unknown as Resolver<AddressFormValues, any, AddressFormValues>,
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
