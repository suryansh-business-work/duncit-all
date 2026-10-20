import { Controller, useWatch, type Control } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import { weekdayLabels } from '@duncit/slots';

import { SectionHeader } from '@/components/SectionHeader';
import { ToggleRow } from '@/components/ToggleRow';
import { useTranslation } from '@/hooks/useTranslation';
import { ControlledTimeField } from './ControlledTimeField';
import type { VenuePricingValues } from './venue-pricing.types';

/**
 * When hosts may book, one row per weekday (0 = Sunday). A closed day sends
 * no row; with no day open the server falls back to the venue's regular
 * hours, which the hint says.
 */
export function OpeningHoursSection({
  control,
}: Readonly<{ control: Control<VenuePricingValues> }>) {
  const { t } = useTranslation();
  const labels = weekdayLabels(t);
  const hours = useWatch({ control, name: 'hours' });

  return (
    <YStack gap={12} testID="venue-pricing-hours">
      <SectionHeader title={t('availability.pricingModule.hoursTitle')} />
      <Text fontSize={12} color="$muted">
        {t('availability.pricingModule.hoursHint')}
      </Text>
      {hours.map((row, index) => (
        <YStack key={row.day} gap={8}>
          <Controller
            control={control}
            name={`hours.${index}.open`}
            render={({ field }) => (
              <ToggleRow
                testID={`venue-pricing-hours-${row.day}`}
                label={labels.full[row.day] ?? ''}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          {row.open ? (
            <XStack gap={8}>
              <ControlledTimeField
                control={control}
                name={`hours.${index}.from`}
                label={t('availability.pricingModule.opens')}
                testID={`venue-pricing-hours-${row.day}-from`}
              />
              <ControlledTimeField
                control={control}
                name={`hours.${index}.to`}
                label={t('availability.pricingModule.closes')}
                testID={`venue-pricing-hours-${row.day}-to`}
              />
            </XStack>
          ) : null}
        </YStack>
      ))}
    </YStack>
  );
}
