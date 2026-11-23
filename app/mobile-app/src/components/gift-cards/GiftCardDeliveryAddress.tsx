import { useEffect, useMemo } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { Text } from 'tamagui';
import { makeShipToSchema, shipToValues, type ShipToValues } from '@duncit/forms/schemas';

import { SectionHeader } from '@/components/SectionHeader';
import { ShipToFields } from '@/components/ShipToFields';
import { SurfaceCard } from '@/components/SurfaceCard';
import type { CheckoutMe } from '@/hooks/useCheckout';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';

/**
 * Where printed cards are delivered — the courier ship-to rules shared with
 * mWeb and the server. Prefilled from the buyer's saved address and name.
 * mWeb twin: DeliveryAddressCard.
 */
export function useGiftCardDeliveryForm(me: CheckoutMe) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeShipToSchema(t), [t]);
  const initial = useMemo(
    () =>
      shipToValues({
        ...(me?.address ?? {}),
        name: [me?.first_name, me?.last_name].filter(Boolean).join(' '),
        phone: me?.phone_number ?? '',
      }),
    [me],
  );
  const form = useForm<ShipToValues, unknown, ShipToValues>({
    defaultValues: initial,
    resolver: formResolver<ShipToValues>(schema),
    mode: 'onTouched',
  });
  const { reset } = form;
  useEffect(() => reset(initial), [initial, reset]);
  return form;
}

export function GiftCardDeliveryAddress({
  control,
}: Readonly<{ control: Control<ShipToValues, unknown, ShipToValues> }>) {
  const { t } = useTranslation();
  return (
    <SurfaceCard gap={12} testID="gift-card-delivery-address">
      <SectionHeader title={t('mweb.giftCards.deliveryAddressTitle')} />
      <Text fontSize={13} color="$muted">
        {t('mweb.giftCards.deliveryAddressHint')}
      </Text>
      <ShipToFields control={control} />
    </SurfaceCard>
  );
}
