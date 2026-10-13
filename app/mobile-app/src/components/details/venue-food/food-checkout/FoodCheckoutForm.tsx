import type { Control } from 'react-hook-form';
import { Text, YStack } from 'tamagui';
import type { FoodCheckoutValues } from '@duncit/forms/schemas';
import { FOOD_ORDER_LIMITS } from '@duncit/utils';

import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  control: Control<FoodCheckoutValues>;
  /** A payment is in flight: the fields lock with the button. */
  disabled: boolean;
}

/**
 * Who the order is for and where it goes: name, mobile, and optionally the
 * table and a note for the kitchen. Tamagui twin of mWeb's
 * food-checkout/food-checkout.form — same schema, same limits, same copy.
 */
export function FoodCheckoutForm({ control, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack gap={12} testID="food-checkout-form">
      <Text role="heading" fontSize={16} fontWeight="600" color="$color">
        {t('mweb.venueFood.checkout.title')}
      </Text>
      <FormTextField
        control={control}
        name="name"
        label={t('mweb.venueFood.checkout.name')}
        required
        autoComplete="name"
        textContentType="name"
        autoCapitalize="words"
        maxLength={FOOD_ORDER_LIMITS.nameMax}
        editable={!disabled}
      />
      <FormTextField
        control={control}
        name="phone"
        label={t('mweb.venueFood.checkout.phone')}
        hint={t('mweb.venueFood.checkout.phoneHint')}
        required
        digitsOnly
        keyboardType="number-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        maxLength={FOOD_ORDER_LIMITS.phoneLength}
        editable={!disabled}
      />
      <FormTextField
        control={control}
        name="table"
        label={t('mweb.venueFood.checkout.table')}
        hint={t('mweb.venueFood.checkout.tableHint')}
        maxLength={FOOD_ORDER_LIMITS.tableMax}
        editable={!disabled}
      />
      <FormTextField
        control={control}
        name="note"
        label={t('mweb.venueFood.checkout.note')}
        hint={t('mweb.venueFood.checkout.noteHint')}
        multiline
        numberOfLines={3}
        maxLength={FOOD_ORDER_LIMITS.noteMax}
        editable={!disabled}
      />
    </YStack>
  );
}
