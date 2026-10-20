import { Controller, type Control } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { FormTextField } from '@/components/FormTextField';
import { ChipSelectField } from '@/components/create-pod/ChipSelectField';
import { DateTimePickerField } from '@/components/venue-availability/DateTimePickerField';
import { dayFromKey, dayKeyOf } from '@/components/venue-availability/availability-grid';
import { useTranslation } from '@/hooks/useTranslation';
import { ControlledWeekdays, FieldError } from './ControlledTimeField';
import type { FormRuleType, VenuePricingValues } from './venue-pricing.types';

interface Props {
  index: number;
  type: FormRuleType;
  control: Control<VenuePricingValues>;
  onRemove: () => void;
}

/** One date of a range, held as 'YYYY-MM-DD' and picked from the app's calendar sheet. */
function RangeDateField({
  control,
  name,
  label,
  testID,
}: Readonly<{
  control: Control<VenuePricingValues>;
  name: `rules.${number}.from` | `rules.${number}.to`;
  label: string;
  testID: string;
}>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <YStack flex={1} gap={4}>
          <DateTimePickerField
            testID={testID}
            label={label}
            value={field.value ? dayFromKey(field.value) : null}
            onChange={(date) => field.onChange(dayKeyOf(date))}
          />
          <FieldError message={fieldState.error?.message} testID={`${testID}-error`} />
        </YStack>
      )}
    />
  );
}

/**
 * One price rule: a weekday surcharge (which days) or a date range (from..to),
 * changing the base by a percent or a flat amount. A negative value is a
 * discount; the server applies each rule on the base, never compounded.
 */
export function PriceRuleRow({ index, type, control, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  const modes = [
    { value: 'PERCENT', label: t('availability.pricingModule.modePercent') },
    { value: 'FLAT', label: t('availability.pricingModule.modeFlat') },
  ];
  const testID = `venue-pricing-rule-${index}`;

  return (
    <YStack testID={testID} gap={8} padding={12} borderRadius={16} backgroundColor="$soft">
      <Text fontSize={13} fontWeight="600" color="$color">
        {type === 'DATE_RANGE'
          ? t('availability.pricingModule.ruleRange')
          : t('availability.pricingModule.ruleWeekday')}
      </Text>
      <FormTextField
        control={control}
        name={`rules.${index}.label`}
        label={t('availability.pricingModule.ruleLabel')}
        maxLength={80}
      />
      {type === 'DATE_RANGE' ? (
        <XStack gap={8}>
          <RangeDateField
            control={control}
            name={`rules.${index}.from`}
            label={t('availability.pricingModule.ruleFrom')}
            testID={`${testID}-from`}
          />
          <RangeDateField
            control={control}
            name={`rules.${index}.to`}
            label={t('availability.pricingModule.ruleTo')}
            testID={`${testID}-to`}
          />
        </XStack>
      ) : (
        <ControlledWeekdays
          control={control}
          name={`rules.${index}.days`}
          testID={`${testID}-days`}
        />
      )}
      <Controller
        control={control}
        name={`rules.${index}.mode`}
        render={({ field }) => (
          <ChipSelectField
            testID={`${testID}-mode`}
            label={t('availability.pricingModule.ruleMode')}
            options={modes}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <FormTextField
        control={control}
        name={`rules.${index}.value`}
        label={t('availability.pricingModule.ruleValue')}
        keyboardType="numbers-and-punctuation"
        required
      />
      <XStack justifyContent="flex-end">
        <DuncitButton
          testID={`${testID}-remove`}
          label={t('availability.pricingModule.removeRule')}
          onPress={onRemove}
          variant="ghost"
          tone="danger"
          size="sm"
        />
      </XStack>
    </YStack>
  );
}
