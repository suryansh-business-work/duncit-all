import { Controller, type Control, type Path } from 'react-hook-form';
import { Text, YStack } from 'tamagui';

import { TimePickerField } from '@/components/venue-availability/TimePickerField';
import { WeekdayChips } from '@/components/venue-availability/recurring/WeekdayChips';
import type { VenuePricingValues } from './venue-pricing.types';

/** A field's Zod message under a picker that draws no error line of its own. */
export function FieldError({ message, testID }: Readonly<{ message?: string; testID: string }>) {
  if (!message) return null;
  return (
    <Text role="alert" testID={testID} fontSize={12} color="$danger">
      {message}
    </Text>
  );
}

interface TimeProps {
  control: Control<VenuePricingValues>;
  name: Path<VenuePricingValues>;
  label: string;
  testID: string;
}

/** The availability screen's hour/quarter chip picker, bound to the pricing form. */
export function ControlledTimeField({ control, name, label, testID }: Readonly<TimeProps>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <YStack flex={1} gap={4}>
          <TimePickerField
            testID={testID}
            label={label}
            value={typeof field.value === 'string' ? field.value : ''}
            onChange={field.onChange}
          />
          <FieldError message={fieldState.error?.message} testID={`${testID}-error`} />
        </YStack>
      )}
    />
  );
}

/** The seven weekday chips (0 = Sunday), bound to a `number[]` field. */
export function ControlledWeekdays({ control, name, testID }: Readonly<Omit<TimeProps, 'label'>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <YStack gap={4}>
          <WeekdayChips
            testID={testID}
            value={Array.isArray(field.value) ? field.value.filter(isDay) : []}
            onChange={field.onChange}
          />
          <FieldError message={fieldState.error?.message} testID={`${testID}-error`} />
        </YStack>
      )}
    />
  );
}

const isDay = (value: unknown): value is number => typeof value === 'number';
