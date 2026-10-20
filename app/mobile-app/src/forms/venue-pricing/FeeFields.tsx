import { Controller, type Control } from 'react-hook-form';
import { XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { SectionHeader } from '@/components/SectionHeader';
import { ToggleRow } from '@/components/ToggleRow';
import { useTranslation } from '@/hooks/useTranslation';
import type { VenuePricingValues } from './venue-pricing.types';

/**
 * What sits on top of the base: the minimum-spend top-up, the cleaning and
 * pet fees, GST. The deposit is refundable and paid at the venue, so it is
 * never part of the booking price — its hint says so.
 */
export function FeeFields({ control }: Readonly<{ control: Control<VenuePricingValues> }>) {
  const { t } = useTranslation();
  return (
    <YStack gap={12} testID="venue-pricing-fees">
      <SectionHeader title={t('availability.pricingModule.feesTitle')} />
      <FormTextField
        control={control}
        name="min_spend"
        label={t('availability.pricingModule.minSpend')}
        hint={t('availability.pricingModule.minSpendHint')}
        keyboardType="decimal-pad"
      />
      <XStack gap={8}>
        <YStack flex={1}>
          <FormTextField
            control={control}
            name="cleaning_fee"
            label={t('availability.pricingModule.cleaningFee')}
            keyboardType="decimal-pad"
          />
        </YStack>
        <YStack flex={1}>
          <FormTextField
            control={control}
            name="pet_fee"
            label={t('availability.pricingModule.petFee')}
            hint={t('availability.pricingModule.petFeeHint')}
            keyboardType="decimal-pad"
          />
        </YStack>
      </XStack>
      <FormTextField
        control={control}
        name="deposit"
        label={t('availability.pricingModule.deposit')}
        hint={t('availability.pricingModule.depositHint')}
        keyboardType="decimal-pad"
      />
      <Controller
        control={control}
        name="gst_enabled"
        render={({ field }) => (
          <ToggleRow
            testID="venue-pricing-gst"
            label={t('availability.pricingModule.gst')}
            hint={t('availability.pricingModule.gstHint')}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
    </YStack>
  );
}
