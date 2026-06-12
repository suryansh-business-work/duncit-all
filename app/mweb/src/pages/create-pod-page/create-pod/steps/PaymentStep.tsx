import { Controller } from 'react-hook-form';
import { MenuItem, Stack, TextField } from '@mui/material';
import PlaceChargesField from '../fields/PlaceChargesField';
import { OCCURRENCES, POD_TYPES, type CreatePodForm } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
}

/** Step 7 — pricing, occurrence, spots, payment terms and place charges. */
export default function PaymentStep({ form }: Readonly<Props>) {
  const {
    control,
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const podType = watch('pod_type');
  const isFree = podType.includes('FREE');
  const isPhysical = watch('pod_mode') === 'PHYSICAL';

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Controller
          control={control}
          name="pod_type"
          render={({ field }) => (
            <TextField
              select
              label="Pod type"
              fullWidth
              value={field.value}
              onChange={(e) => {
                field.onChange(e.target.value);
                if (e.target.value.includes('FREE')) setValue('pod_amount', 0);
              }}
            >
              {POD_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
              ))}
            </TextField>
          )}
        />
        <Controller
          control={control}
          name="pod_occurrence"
          render={({ field }) => (
            <TextField select label="Occurrence" fullWidth value={field.value} onChange={field.onChange}>
              {OCCURRENCES.map((occurrence) => (
                <MenuItem key={occurrence.value} value={occurrence.value}>{occurrence.label}</MenuItem>
              ))}
            </TextField>
          )}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Amount (₹)"
          type="number"
          fullWidth
          disabled={isFree}
          error={!!errors.pod_amount}
          helperText={errors.pod_amount?.message ?? (isFree ? 'Free pod amount must be 0.' : 'Gross price, max 1999.')}
          {...register('pod_amount', { valueAsNumber: true })}
        />
        <TextField
          label="No. of spots"
          type="number"
          fullWidth
          error={!!errors.no_of_spots}
          helperText={errors.no_of_spots?.message}
          {...register('no_of_spots', { valueAsNumber: true })}
        />
      </Stack>
      <TextField
        label="Payment terms"
        fullWidth
        multiline
        minRows={3}
        helperText="Refund policy, cancellation, tax info."
        {...register('payment_terms')}
      />
      {isPhysical && (
        <Controller
          control={control}
          name="place_charges"
          render={({ field }) => (
            <PlaceChargesField
              value={field.value}
              onChange={field.onChange}
              helperText="Optional venue-side charges (entry, table, etc.) shown separately to users."
            />
          )}
        />
      )}
    </Stack>
  );
}
