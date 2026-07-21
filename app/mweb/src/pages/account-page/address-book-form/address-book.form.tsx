import { useEffect } from 'react';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
} from '@mui/material';
import { blankAddressValues, type AddressFormValues } from './address-book.types';

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
  const { control, handleSubmit, reset } = useForm<AddressFormValues>({
    defaultValues: initial ?? blankAddressValues,
    resolver: zodResolver(addressSchema),
    mode: 'onTouched',
  });

  useEffect(() => {
    if (open) reset(initial ?? blankAddressValues);
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
      <DialogTitle sx={{ fontWeight: 900 }}>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          {field('label', 'Label (Home, Office…)')}
          {field('name', 'Receiver name')}
          {field('phone', 'Phone')}
          {field('line1', 'Address line 1')}
          {field('line2', 'Address line 2')}
          {field('landmark', 'Landmark')}
          <Stack direction="row" spacing={1.5}>
            {field('city', 'City')}
            {field('state', 'State')}
          </Stack>
          <Stack direction="row" spacing={1.5}>
            {field('pincode', 'Pincode')}
            {field('country', 'Country')}
          </Stack>
          <Controller
            name="is_default"
            control={control}
            render={({ field: f }) => (
              <FormControlLabel
                control={<Checkbox checked={f.value} onChange={(e) => f.onChange(e.target.checked)} />}
                label="Use as my default address"
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={saving} sx={{ fontWeight: 800 }}>
          Save address
        </Button>
      </DialogActions>
    </Dialog>
  );
}
