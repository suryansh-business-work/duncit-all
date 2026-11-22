import type { Control } from 'react-hook-form';
import { YStack } from 'tamagui';
import type { ShipToValues } from '@duncit/forms/schemas';

import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * The courier ship-to fields (@duncit/forms makeShipToSchema) — recipient,
 * phone and the address. One set for every native surface that collects where
 * a parcel goes: a brand fixing an order's address, a buyer's printed gift cards.
 */
export function ShipToFields({
  control,
}: Readonly<{ control: Control<ShipToValues, unknown, ShipToValues> }>) {
  const { t } = useTranslation();
  return (
    <YStack gap={12}>
      <FormTextField
        control={control}
        name="name"
        label={t('mweb.brandOrders.recipientName')}
        required
        autoComplete="name"
        textContentType="name"
      />
      <FormTextField
        control={control}
        name="phone"
        label={t('mweb.brandOrders.phone')}
        required
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
      />
      <FormTextField
        control={control}
        name="line1"
        label={t('mweb.address.line1')}
        required
        autoComplete="address-line1"
        textContentType="streetAddressLine1"
      />
      <FormTextField
        control={control}
        name="line2"
        label={t('mweb.address.line2')}
        autoComplete="address-line2"
        textContentType="streetAddressLine2"
      />
      <FormTextField control={control} name="landmark" label={t('mweb.address.landmark')} />
      <FormTextField
        control={control}
        name="city"
        label={t('mweb.address.city')}
        required
        autoComplete="postal-address-locality"
        textContentType="addressCity"
      />
      <FormTextField
        control={control}
        name="state"
        label={t('mweb.address.state')}
        required
        autoComplete="postal-address-region"
        textContentType="addressState"
      />
      <FormTextField
        control={control}
        name="pincode"
        label={t('mweb.address.pincode')}
        required
        digitsOnly
        keyboardType="number-pad"
        maxLength={6}
        autoComplete="postal-code"
        textContentType="postalCode"
      />
      <FormTextField
        control={control}
        name="country"
        label={t('mweb.address.country')}
        autoComplete="country"
        textContentType="countryName"
      />
    </YStack>
  );
}
