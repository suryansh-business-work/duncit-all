import type { Control } from 'react-hook-form';
import { XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { SectionHeader } from '@/components/SectionHeader';
import { useTranslation } from '@/hooks/useTranslation';
import type { PricingModelName, VenuePricingValues } from './venue-pricing.types';

interface Props {
  control: Control<VenuePricingValues>;
  model: PricingModelName;
}

/**
 * The rate and the limits the picked model reads: guests for per-guest,
 * hours and the booking step for per-hour, just the fee for flat. A per-slot
 * venue prices each slot instead, so it has no rate here.
 */
export function RateFields({ control, model }: Readonly<Props>) {
  const { t } = useTranslation();
  if (model === 'PER_SLOT') return null;
  const rateLabels: Record<Exclude<PricingModelName, 'PER_SLOT'>, string> = {
    PER_PAX: t('availability.pricingModule.ratePerPax'),
    PER_HOUR: t('availability.pricingModule.ratePerHour'),
    FLAT: t('availability.pricingModule.rateFlat'),
  };

  return (
    <YStack gap={12} testID="venue-pricing-rate">
      <SectionHeader title={t('availability.pricingModule.rateTitle')} />
      <FormTextField
        control={control}
        name="base_rate"
        label={rateLabels[model]}
        keyboardType="decimal-pad"
        required
      />
      {model === 'PER_PAX' ? (
        <XStack gap={8}>
          <YStack flex={1}>
            <FormTextField
              control={control}
              name="min_pax"
              label={t('availability.pricingModule.minPax')}
              keyboardType="number-pad"
              digitsOnly
            />
          </YStack>
          <YStack flex={1}>
            <FormTextField
              control={control}
              name="max_pax"
              label={t('availability.pricingModule.maxPax')}
              keyboardType="number-pad"
              digitsOnly
            />
          </YStack>
        </XStack>
      ) : null}
      {model === 'PER_HOUR' ? (
        <>
          <XStack gap={8}>
            <YStack flex={1}>
              <FormTextField
                control={control}
                name="min_hours"
                label={t('availability.pricingModule.minHours')}
                keyboardType="decimal-pad"
              />
            </YStack>
            <YStack flex={1}>
              <FormTextField
                control={control}
                name="max_hours"
                label={t('availability.pricingModule.maxHours')}
                keyboardType="decimal-pad"
              />
            </YStack>
          </XStack>
          <FormTextField
            control={control}
            name="booking_increment_minutes"
            label={t('availability.pricingModule.increment')}
            keyboardType="number-pad"
            digitsOnly
          />
        </>
      ) : null}
    </YStack>
  );
}
