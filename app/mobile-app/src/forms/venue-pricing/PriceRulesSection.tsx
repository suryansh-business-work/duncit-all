import { useFieldArray, type Control } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { SectionHeader } from '@/components/SectionHeader';
import { useTranslation } from '@/hooks/useTranslation';
import { PriceRuleRow } from './PriceRuleRow';
import type { FormRuleType, PriceRuleValues, VenuePricingValues } from './venue-pricing.types';

const emptyRule = (type: FormRuleType): PriceRuleValues => ({
  type,
  label: '',
  days: [],
  from: '',
  to: '',
  mode: 'PERCENT',
  value: '',
});

/**
 * Weekday surcharges and date ranges. A single date's own price is set on the
 * calendar (it wins over every other rule that day), so it is not listed here.
 */
export function PriceRulesSection({ control }: Readonly<{ control: Control<VenuePricingValues> }>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'rules' });

  return (
    <YStack gap={12} testID="venue-pricing-rules">
      <SectionHeader title={t('availability.pricingModule.rulesTitle')} />
      <Text fontSize={12} color="$muted">
        {t('availability.pricingModule.rulesHint')}
      </Text>
      {fields.length === 0 ? (
        <Text testID="venue-pricing-no-rules" fontSize={14} color="$muted">
          {t('availability.pricingModule.noRules')}
        </Text>
      ) : null}
      {fields.map((field, index) => (
        <PriceRuleRow
          key={field.id}
          index={index}
          type={field.type}
          control={control}
          onRemove={() => remove(index)}
        />
      ))}
      <XStack gap={8} flexWrap="wrap">
        <DuncitButton
          testID="venue-pricing-add-weekday-rule"
          label={t('availability.pricingModule.addWeekdayRule')}
          onPress={() => append(emptyRule('WEEKDAY_SURCHARGE'))}
          variant="outline"
          tone="neutral"
          size="sm"
        />
        <DuncitButton
          testID="venue-pricing-add-range-rule"
          label={t('availability.pricingModule.addRangeRule')}
          onPress={() => append(emptyRule('DATE_RANGE'))}
          variant="outline"
          tone="neutral"
          size="sm"
        />
      </XStack>
    </YStack>
  );
}
