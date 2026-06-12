import { Controller } from 'react-hook-form';
import { YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { ChipSelectField } from '../ChipSelectField';
import { PlaceChargesField } from '../PlaceChargesField';
import { OCCURRENCES, POD_TYPES, type CreatePodForm } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
}

/** Step 7 — pricing, occurrence, spots, payment terms and place charges. */
export function PaymentStep({ form }: Readonly<Props>) {
  const { control, watch, setValue } = form;
  const isPhysical = watch('pod_mode') === 'PHYSICAL';

  return (
    <YStack gap={14}>
      <Controller
        control={control}
        name="pod_type"
        render={({ field }) => (
          <ChipSelectField
            label="Pod type"
            options={[...POD_TYPES]}
            value={field.value}
            onChange={(next) => {
              field.onChange(next);
              if (next.includes('FREE')) setValue('pod_amount_text', '0');
            }}
            testID="create-pod-type"
          />
        )}
      />
      <Controller
        control={control}
        name="pod_occurrence"
        render={({ field }) => (
          <ChipSelectField
            label="Occurrence"
            options={[...OCCURRENCES]}
            value={field.value}
            onChange={field.onChange}
            testID="create-pod-occurrence"
          />
        )}
      />
      <FormTextField
        control={control}
        name="pod_amount_text"
        label="Amount (₹)"
        keyboardType="numeric"
      />
      <FormTextField
        control={control}
        name="no_of_spots_text"
        label="No. of spots"
        keyboardType="numeric"
      />
      <FormTextField control={control} name="payment_terms" label="Payment terms" multiline />
      {isPhysical ? (
        <Controller
          control={control}
          name="place_charges"
          render={({ field }) => (
            <PlaceChargesField value={field.value} onChange={field.onChange} />
          )}
        />
      ) : null}
    </YStack>
  );
}
