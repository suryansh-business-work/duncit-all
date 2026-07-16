import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
} from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import {
  pickupLocationInitialValues,
  pickupLocationSchema,
  type PickupLocationFormValues,
} from './pickup-location.types';

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
  title = 'Pickup location',
  initialValues,
  saving,
  onClose,
  onSubmit,
}: Readonly<Props>) {
  const { control, handleSubmit, reset } = useForm<PickupLocationFormValues>({
    defaultValues: initialValues ?? pickupLocationInitialValues,
    resolver: zodResolver(pickupLocationSchema),
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
      <DialogTitle>{title}</DialogTitle>
      <form noValidate onSubmit={submit}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <RhfTextField control={control} name="nickname" label="Nickname" required hint="e.g. Main warehouse" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <RhfTextField control={control} name="contact_name" label="Contact name" required hint=" " />
            </Grid>
            <Grid item xs={12} sm={6}>
              <RhfTextField control={control} name="phone" label="Phone" required hint="10-digit mobile number" />
            </Grid>
            <Grid item xs={12}>
              <RhfTextField control={control} name="email" label="Email" type="email" required hint=" " />
            </Grid>
            <Grid item xs={12}>
              <RhfTextField control={control} name="address_line1" label="Address line 1" required hint=" " />
            </Grid>
            <Grid item xs={12}>
              <RhfTextField control={control} name="address_line2" label="Address line 2" hint="Optional" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <RhfTextField control={control} name="city" label="City" required hint=" " />
            </Grid>
            <Grid item xs={12} sm={6}>
              <RhfTextField control={control} name="state" label="State" required hint=" " />
            </Grid>
            <Grid item xs={12} sm={6}>
              <RhfTextField control={control} name="pincode" label="Pincode" required hint="6-digit PIN" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <RhfTextField control={control} name="country" label="Country" required hint=" " />
            </Grid>
            <Grid item xs={12}>
              <Controller
                control={control}
                name="is_default"
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox checked={!!field.value} onChange={(_, value) => field.onChange(value)} />
                    }
                    label="Set as the default pickup location"
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Saving…' : 'Save location'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
