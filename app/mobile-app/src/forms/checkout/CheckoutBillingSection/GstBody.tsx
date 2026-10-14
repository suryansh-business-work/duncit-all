import { useController, type Control } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { AppSwitch } from '@/components/AppSwitch';
import { useTranslation } from '@/hooks/useTranslation';
import type { CheckoutFormValues } from '../checkout.types';

/** GST accordion body: a switch that reveals the GSTIN input when on. */
export function GstBody({ control }: Readonly<{ control: Control<CheckoutFormValues> }>) {
  const { t } = useTranslation();
  const { field } = useController({ control, name: 'has_gstin' });
  const hasGstin = !!field.value;
  return (
    <YStack gap={12}>
      <XStack alignItems="center" gap={12}>
        <Text flex={1} fontSize={13.5} color="$color">
          {t('mweb.checkout.hasGstin')}
        </Text>
        <AppSwitch
          testID="billing-has-gstin"
          aria-label={t('mweb.checkout.hasGstinAria')}
          value={hasGstin}
          onValueChange={field.onChange}
        />
      </XStack>
      {hasGstin ? (
        <FormTextField
          control={control}
          name="gstin"
          label={t('mweb.checkout.gstin')}
          hint={t('mweb.checkout.gstinHint')}
          autoCapitalize="characters"
          maxLength={15}
        />
      ) : null}
    </YStack>
  );
}
