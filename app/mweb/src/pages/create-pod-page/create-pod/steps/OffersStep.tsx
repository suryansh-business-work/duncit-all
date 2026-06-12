import { Controller } from 'react-hook-form';
import { Stack } from '@mui/material';
import ChipArrayField from '../fields/ChipArrayField';
import type { CreatePodForm } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
}

/** Step 4 — what this pod offers (chip list). */
export default function OffersStep({ form }: Readonly<Props>) {
  return (
    <Stack spacing={2}>
      <Controller
        control={form.control}
        name="what_this_pod_offers"
        render={({ field, fieldState }) => (
          <ChipArrayField
            label="What this pod offers"
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            placeholder="e.g. Coaching, Snacks — press Enter"
          />
        )}
      />
    </Stack>
  );
}
