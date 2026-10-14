import { Controller, useWatch, type Control } from 'react-hook-form';
import { YStack } from 'tamagui';
import { VENUE_FOOD_TAX_MODES, type FoodMenuFormValues } from '@duncit/utils';

import { ChipSelectField } from '@/components/create-pod/ChipSelectField';
import { FormTextField } from '@/components/FormTextField';
import { ToggleRow } from '@/components/ToggleRow';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * A venue's own GST on its QR orders — the Tamagui twin of @duncit/forms'
 * `FoodTaxFields`, on the same words (`shell.foodTax.*`) and the same rules
 * (`makeVenueFoodTaxRefinement`). Off, the venue follows Duncit Finance's
 * default: the mode and percent stay visible, read-only, as the server
 * resolved them. On, they price every order.
 */
export function FoodMenuTaxFields({ control }: Readonly<{ control: Control<FoodMenuFormValues> }>) {
  const { t } = useTranslation();
  const override = useWatch({ control, name: 'food_ordering.tax_override' });
  const modeLabels: Record<(typeof VENUE_FOOD_TAX_MODES)[number], string> = {
    INCLUSIVE: t('shell.foodTax.inclusive'),
    EXCLUSIVE: t('shell.foodTax.exclusive'),
  };

  return (
    <YStack gap={12} testID="food-menu-tax">
      <Controller
        control={control}
        name="food_ordering.tax_override"
        render={({ field }) => (
          <ToggleRow
            testID="food-menu-tax-override"
            label={t('shell.foodTax.override')}
            hint={t('shell.foodTax.overrideHint')}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="food_ordering.tax_mode"
        render={({ field, fieldState }) => (
          <ChipSelectField
            testID="food-menu-tax-mode"
            label={t('shell.foodTax.taxMode')}
            options={VENUE_FOOD_TAX_MODES.map((mode) => ({ value: mode, label: modeLabels[mode] }))}
            value={field.value}
            onChange={(mode) => {
              if (override) field.onChange(mode);
            }}
            error={fieldState.error?.message}
          />
        )}
      />
      <FormTextField
        control={control}
        name="food_ordering.gst_pct"
        label={t('shell.foodTax.gstPct')}
        keyboardType="number-pad"
        digitsOnly
        editable={override}
      />
    </YStack>
  );
}
