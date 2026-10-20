import { useFieldArray, type Control } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { FormTextField } from '@/components/FormTextField';
import { SectionHeader } from '@/components/SectionHeader';
import { useTranslation } from '@/hooks/useTranslation';
import { ControlledTimeField, ControlledWeekdays, FieldError } from './ControlledTimeField';
import type { PricingSlotValues, VenuePricingValues } from './venue-pricing.types';

interface Props {
  control: Control<VenuePricingValues>;
  /** The "add at least one slot" message, when the list is empty on save. */
  listError?: string;
  /** Where a new slot starts — the venue's regular hours, never a made-up time. */
  newSlot: PricingSlotValues;
}

/**
 * A PER_SLOT venue's bookable windows: each a start, an end, a price and the
 * weekdays it repeats on. The server refuses two slots overlapping on one day
 * and names it; the owner reads that on save.
 */
export function PricingSlotsSection({ control, listError, newSlot }: Readonly<Props>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'slots' });

  return (
    <YStack gap={12} testID="venue-pricing-slots">
      <SectionHeader title={t('availability.pricingModule.slotsTitle')} />
      <Text fontSize={12} color="$muted">
        {t('availability.pricingModule.slotsHint')}
      </Text>
      {fields.length === 0 ? (
        <Text testID="venue-pricing-no-slots" fontSize={14} color="$muted">
          {t('availability.pricingModule.noSlots')}
        </Text>
      ) : null}
      <FieldError message={listError} testID="venue-pricing-slots-error" />
      {fields.map((field, index) => (
        <YStack
          key={field.id}
          testID={`venue-pricing-slot-${index}`}
          gap={8}
          padding={12}
          borderRadius={16}
          backgroundColor="$soft"
        >
          <XStack gap={8}>
            <ControlledTimeField
              control={control}
              name={`slots.${index}.start_time`}
              label={t('availability.pricingModule.slotStart')}
              testID={`venue-pricing-slot-${index}-start`}
            />
            <ControlledTimeField
              control={control}
              name={`slots.${index}.end_time`}
              label={t('availability.pricingModule.slotEnd')}
              testID={`venue-pricing-slot-${index}-end`}
            />
          </XStack>
          <FormTextField
            control={control}
            name={`slots.${index}.price`}
            label={t('availability.pricingModule.slotPrice')}
            keyboardType="decimal-pad"
            required
          />
          <ControlledWeekdays
            control={control}
            name={`slots.${index}.days_of_week`}
            testID={`venue-pricing-slot-${index}-days`}
          />
          <XStack justifyContent="flex-end">
            <DuncitButton
              testID={`venue-pricing-slot-${index}-remove`}
              label={t('availability.pricingModule.removeSlot')}
              onPress={() => remove(index)}
              variant="ghost"
              tone="danger"
              size="sm"
            />
          </XStack>
        </YStack>
      ))}
      <XStack>
        <DuncitButton
          testID="venue-pricing-add-slot"
          label={t('availability.pricingModule.addSlot')}
          onPress={() => append({ ...newSlot, days_of_week: [...newSlot.days_of_week] })}
          variant="outline"
          tone="neutral"
        />
      </XStack>
    </YStack>
  );
}
