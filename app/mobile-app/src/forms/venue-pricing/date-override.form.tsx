import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { FormTextField } from '@/components/FormTextField';
import { ChipSelectField } from '@/components/create-pod/ChipSelectField';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import {
  makeDateOverrideSchema,
  type DateOverrideValues,
  type RuleModeName,
} from './venue-pricing.types';

interface Props {
  /** The date's current override, or null when it has none. */
  current: DateOverrideValues | null;
  busy: boolean;
  onSave: (mode: RuleModeName, value: number) => void;
  onClear: () => void;
}

/**
 * One calendar date's own price — a DATE_OVERRIDE. It replaces every other
 * price rule on that date (the server's stacking rule), which the hint says.
 */
export function DateOverrideForm({ current, busy, onSave, onClear }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeDateOverrideSchema(t), [t]);
  const { control, handleSubmit } = useForm<DateOverrideValues, any, DateOverrideValues>({
    resolver: formResolver<DateOverrideValues>(schema),
    defaultValues: current ?? { mode: 'PERCENT', value: '' },
  });
  const modes = [
    { value: 'PERCENT', label: t('availability.pricingModule.modePercent') },
    { value: 'FLAT', label: t('availability.pricingModule.modeFlat') },
  ];
  const submit = handleSubmit((values) => onSave(values.mode, Number(values.value)));

  return (
    <YStack gap={10} testID="pricing-day-override">
      <Text role="heading" fontSize={15} fontWeight="600" color="$color">
        {t('availability.pricingModule.day.overrideTitle')}
      </Text>
      <Text fontSize={12} color="$muted">
        {t('availability.pricingModule.day.overrideHint')}
      </Text>
      <Controller
        control={control}
        name="mode"
        render={({ field }) => (
          <ChipSelectField
            testID="pricing-day-override-mode"
            label={t('availability.pricingModule.ruleMode')}
            options={modes}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <FormTextField
        control={control}
        name="value"
        label={t('availability.pricingModule.ruleValue')}
        keyboardType="numbers-and-punctuation"
        required
      />
      <XStack gap={8} flexWrap="wrap">
        <DuncitButton
          testID="pricing-day-override-save"
          label={t('availability.pricingModule.day.overrideSave')}
          onPress={() => {
            submit().catch(() => undefined);
          }}
          disabled={busy}
          size="sm"
        />
        {current ? (
          <DuncitButton
            testID="pricing-day-override-clear"
            label={t('availability.pricingModule.day.overrideClear')}
            onPress={onClear}
            disabled={busy}
            variant="outline"
            tone="danger"
            size="sm"
          />
        ) : null}
      </XStack>
    </YStack>
  );
}
