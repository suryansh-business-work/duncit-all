import { Controller, useFieldArray, useFormState, useWatch, type Control } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import {
  MIN_BUSINESS_MODELS,
  nextMinBusinessRow,
  type BookingOffersValues,
} from '@duncit/forms/schemas';
import { VENUE_MIN_BUSINESS_KEY } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { FieldLabel } from '@/components/Field';
import { FormTextField } from '@/components/FormTextField';
import { SelectChip } from '@/components/venue-availability/SelectChip';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface RowProps {
  control: Control<BookingOffersValues>;
  index: number;
  /** Bases another row already names — drawn faint; picking one again is refused by the schema. */
  taken: ReadonlySet<string>;
  /** Off for the last row left: at least one amount is required. */
  removable: boolean;
  onRemove: () => void;
}

/** One amount: its basis (per guest, per hour or per booking) and the rupees. */
function MinBusinessRow({ control, index, taken, removable, onRemove }: Readonly<RowProps>) {
  const { t } = useTranslation();
  const { danger } = useThemeColors();
  const basis = t('availability.offers.minBusiness.basis');
  return (
    <YStack gap={8} testID={`venue-min-business-row-${index}`}>
      <Controller
        control={control}
        name={`min_business.${index}.model`}
        render={({ field, fieldState }) => (
          <YStack gap={4}>
            <XStack
              gap={8}
              flexWrap="wrap"
              alignItems="center"
              role="radiogroup"
              aria-label={basis}
            >
              {MIN_BUSINESS_MODELS.map((model) => (
                <SelectChip
                  key={model}
                  testID={`venue-min-business-${index}-${model}`}
                  role="radio"
                  label={t(VENUE_MIN_BUSINESS_KEY[model].label)}
                  selected={field.value === model}
                  dim={taken.has(model)}
                  onPress={() => field.onChange(model)}
                />
              ))}
              {removable ? (
                <XStack
                  testID={`venue-min-business-remove-${index}`}
                  role="button"
                  tabIndex={0}
                  hitSlop={6}
                  aria-label={t('availability.offers.minBusiness.remove')}
                  onPress={onRemove}
                  marginLeft="auto"
                  padding={6}
                  pressStyle={PRESS_STYLE.inline}
                >
                  <MaterialIcons name="delete-outline" size={20} color={danger} />
                </XStack>
              ) : null}
            </XStack>
            {fieldState.error?.message ? (
              <Text role="alert" fontSize={12} color="$danger">
                {fieldState.error.message}
              </Text>
            ) : null}
          </YStack>
        )}
      />
      <FormTextField
        control={control}
        name={`min_business.${index}.amount`}
        label={t('availability.offers.minBusiness.amount')}
        keyboardType="decimal-pad"
        required
      />
    </YStack>
  );
}

/**
 * "Business you expect per booking": at least one amount, each on its own
 * basis — per guest, per hour or per booking — added and removed as rows. Hosts
 * see them on Create Pod once they pick the venue, as a guide for their offer,
 * never a rule. One rule with mWeb and the Partners console
 * (`makeBookingOffersSchema`).
 */
export function MinBusinessRows({ control }: Readonly<{ control: Control<BookingOffersValues> }>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'min_business' });
  const rows = useWatch({ control, name: 'min_business' });
  const { errors } = useFormState({ control, name: 'min_business' });
  const listError = errors.min_business?.root?.message ?? errors.min_business?.message;
  const takenBy = (index: number) =>
    new Set(rows.filter((_, at) => at !== index).map((row) => row.model));

  return (
    <YStack gap={12} testID="venue-min-business">
      <FieldLabel
        label={t('availability.offers.minBusiness.title')}
        required
        testID="venue-min-business"
      />
      <Text fontSize={13} color="$muted">
        {t('availability.offers.minBusiness.intro')}
      </Text>
      {fields.map((field, index) => (
        <MinBusinessRow
          key={field.id}
          control={control}
          index={index}
          taken={takenBy(index)}
          removable={fields.length > 1}
          onRemove={() => remove(index)}
        />
      ))}
      {fields.length < MIN_BUSINESS_MODELS.length ? (
        <XStack>
          <DuncitButton
            testID="venue-min-business-add"
            label={t('availability.offers.minBusiness.add')}
            onPress={() => append(nextMinBusinessRow(rows))}
            variant="outline"
            size="sm"
          />
        </XStack>
      ) : null}
      {listError ? (
        <Text testID="venue-min-business-error" role="alert" fontSize={13} color="$danger">
          {listError}
        </Text>
      ) : null}
    </YStack>
  );
}
