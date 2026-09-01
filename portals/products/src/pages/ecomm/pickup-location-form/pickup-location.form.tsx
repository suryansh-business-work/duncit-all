import { useEffect } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import {
  pickupLocationInitialValues,
  pickupLocationSchema,
  type PickupLocationFormValues,
} from './pickup-location.types';
import { useTranslation } from '@duncit/shell';

export { pickupLocationSchema };

interface Props {
  open: boolean;
  title?: string;
  initialValues?: PickupLocationFormValues;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (values: PickupLocationFormValues) => Promise<void> | void;
}

export default function PickupLocationForm({
  open,
  title,
  initialValues,
  saving,
  onClose,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const heading = title ?? t('products.pickup.formTitle');
  const { control, handleSubmit, reset } = useForm<PickupLocationFormValues, any, PickupLocationFormValues>({
    defaultValues: initialValues ?? pickupLocationInitialValues,
    resolver: zodResolver(pickupLocationSchema) as unknown as Resolver<PickupLocationFormValues, any, PickupLocationFormValues>,
    mode: 'onTouched',
  });

  useEffect(() => {
    if (open) reset(initialValues ?? pickupLocationInitialValues);
  }, [open, initialValues, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{heading}</DialogTitle>
      <form noValidate onSubmit={submit}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid size={12}>
              <RhfTextField control={control} name="nickname" label={t('products.pickup.nickname')} required hint="e.g. Main warehouse" />
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <RhfTextField control={control} name="contact_name" label={t('products.pickup.contactName')} required hint=" " />
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <RhfTextField control={control} name="phone" label={t('shell.common.phone')} required hint="10-digit mobile number" />
            </Grid>
            <Grid size={12}>
              <RhfTextField control={control} name="email" label={t('shell.common.email')} type="email" required hint=" " />
            </Grid>
            <Grid size={12}>
              <RhfTextField control={control} name="address_line1" label={t('products.pickup.addressLine1')} required hint=" " />
            </Grid>
            <Grid size={12}>
              <RhfTextField control={control} name="address_line2" label={t('products.pickup.addressLine2')} hint="Optional" />
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <RhfTextField control={control} name="city" label={t('products.pickup.city')} required hint=" " />
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <RhfTextField control={control} name="state" label={t('products.pickup.state')} required hint=" " />
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <RhfTextField control={control} name="pincode" label={t('products.pickup.pincode')} required hint="6-digit PIN" />
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <RhfTextField control={control} name="country" label={t('products.pickup.country')} required hint=" " />
            </Grid>
            <Grid size={12}>
              <Controller
                control={control}
                name="is_default"
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox checked={!!field.value} onChange={(_, value) => field.onChange(value)} />
                    }
                    label={t('products.pickup.setDefault')}
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={onClose} disabled={saving}>
            Cancel
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" disabled={saving}>
            {saving ? 'Saving…' : 'Save location'}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
