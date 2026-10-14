import { Linking } from 'react-native';
import { Controller, useFormState, useWatch, type Control } from 'react-hook-form';
import { Text, YStack } from 'tamagui';
import { partnerPortalUrl } from '@duncit/onboarding';
import { canTakeFoodOrders, type FoodMenuConfig, type FoodMenuFormValues } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { FormTextField } from '@/components/FormTextField';
import { SurfaceCard } from '@/components/SurfaceCard';
import { ToggleRow } from '@/components/ToggleRow';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { FoodMenuTaxFields } from './FoodMenuTaxFields';

interface Props {
  control: Control<FoodMenuFormValues>;
  config: FoodMenuConfig;
  /** The venue's saved GST number; '' when it has none. */
  savedGstin: string;
}

/**
 * Online ordering & payments on the app: whether the owner's Razorpay account
 * is linked (read-only — it is picked in the Partner console, which this links
 * to, and a save from here never names it), the switch that opens ordering
 * from the venue's QR, the QR discount, the venue's GST and the invoice GST
 * number. The twin of @duncit/venue-food's ordering fields.
 */
export function FoodMenuOrdering({ control, config, savedGstin }: Readonly<Props>) {
  const { t } = useTranslation();
  const menu = useWatch({ control, name: 'food_menu' });
  const linked = useWatch({ control, name: 'food_ordering.razorpay_linked' });
  const { errors } = useFormState({ control, name: 'food_ordering.enabled' });
  const canEnable = canTakeFoodOrders(menu, linked);

  return (
    <YStack gap={12} testID="food-menu-ordering">
      <Text role="heading" fontSize={15} fontWeight="700" color="$color">
        {t('venueFoodOwner.menu.orderingTitle')}
      </Text>
      <SurfaceCard gap={8} testID="food-menu-account">
        <Text role="status" fontSize={13} color="$muted">
          {linked
            ? t('venueFoodOwner.menu.accountLinked')
            : t('venueFoodOwner.menu.accountMissing')}
        </Text>
        <DuncitButton
          testID="food-menu-account-manage"
          label={t('venueFoodOwner.menu.accountManage')}
          variant="ghost"
          size="sm"
          onPress={() => fireAndForget(Linking.openURL(partnerPortalUrl('/venues/food-menu')))}
        />
      </SurfaceCard>
      <Controller
        control={control}
        name="food_ordering.enabled"
        render={({ field }) => (
          <ToggleRow
            testID="food-menu-ordering-enabled"
            label={t('venueFoodOwner.menu.orderingEnabled')}
            hint={
              errors.food_ordering?.enabled?.message ??
              (canEnable
                ? t('venueFoodOwner.menu.orderingEnabledHint')
                : t('venueFoodOwner.menu.orderingLockedHint'))
            }
            value={field.value}
            disabled={!canEnable && !field.value}
            onChange={field.onChange}
          />
        )}
      />
      <FormTextField
        control={control}
        name="food_ordering.discount_pct"
        label={t('venueFoodOwner.menu.discount')}
        hint={t('venueFoodOwner.menu.discountHint', {
          vars: { max: config.food_discount_max_pct },
        })}
        keyboardType="number-pad"
        digitsOnly
      />
      <Text role="heading" fontSize={15} fontWeight="700" color="$color">
        {t('venueFoodOwner.menu.taxTitle')}
      </Text>
      <FoodMenuTaxFields control={control} />
      {/* An owner gives the number once; a saved one is shown locked (the server refuses a change). */}
      <FormTextField
        control={control}
        name="gstin"
        label={t('shell.foodTax.gstin')}
        hint={savedGstin ? t('shell.foodTax.gstinLocked') : t('shell.foodTax.gstinHint')}
        autoCapitalize="characters"
        maxLength={15}
        editable={!savedGstin}
      />
    </YStack>
  );
}
