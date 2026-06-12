import { Controller } from 'react-hook-form';
import { Stack } from '@mui/material';
import ChipArrayField from '../fields/ChipArrayField';
import type { CreatePodForm } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
}

/** Step 5 — available perks (chip list). */
export default function PerksStep({ form }: Readonly<Props>) {
  return (
    <Stack spacing={2}>
      <Controller
        control={form.control}
        name="available_perks"
        render={({ field, fieldState }) => (
          <ChipArrayField
            label="Available perks"
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            placeholder="e.g. Free parking, Goodie bag — press Enter"
          />
        )}
      />
    </Stack>
  );
}
