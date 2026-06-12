import { Controller } from 'react-hook-form';
import { YStack } from 'tamagui';

import { ChipArrayField } from '../ChipArrayField';
import type { CreatePodForm } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
}

/** Step 5 — available perks (chip list). */
export function PerksStep({ form }: Readonly<Props>) {
  return (
    <YStack gap={14}>
      <Controller
        control={form.control}
        name="available_perks"
        render={({ field, fieldState }) => (
          <ChipArrayField
            label="Available perks"
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            placeholder="e.g. Free parking, Goodie bag"
            testID="create-pod-perks"
          />
        )}
      />
    </YStack>
  );
}
