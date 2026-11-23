import { useEffect, useMemo } from 'react';
import { useForm, type Control, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, Stack, Typography } from '@mui/material';
import { shipToValues, type ShipToValues } from '@duncit/forms/schemas';
import AddressFields from '../../forms/components/AddressFields';
import RhfTextField from '../../forms/components/RhfTextField';
import { makeShipToFormSchema } from '../brand-order-detail-page/ship-to-form/ship-to.form';
import { useTranslation } from '../../i18n/useTranslation';

const ADDRESS_NAMES = {
  line1: 'line1',
  line2: 'line2',
  landmark: 'landmark',
  city: 'city',
  state: 'state',
  pincode: 'pincode',
  country: 'country',
} as const;

interface MeLike {
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
  address?: Partial<Record<string, string | null>> | null;
}

/**
 * Where printed cards are delivered — the courier ship-to rules shared with
 * native and the server (@duncit/forms makeShipToSchema). Prefilled from the
 * buyer's saved address and name; changed here, it is this order's only.
 */
export function useDeliveryAddressForm(me: MeLike | null | undefined) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeShipToFormSchema(t), [t]);
  const initial = useMemo(
    () =>
      shipToValues({
        ...(me?.address ?? {}),
        name: [me?.first_name, me?.last_name].filter(Boolean).join(' '),
        phone: me?.phone_number ?? '',
      }),
    [me]
  );
  const form = useForm<ShipToValues, unknown, ShipToValues>({
    defaultValues: initial,
    resolver: zodResolver(schema) as unknown as Resolver<ShipToValues, unknown, ShipToValues>,
    mode: 'onTouched',
  });
  const { reset } = form;
  // The profile loads after the page: prefill once it arrives.
  useEffect(() => reset(initial), [initial, reset]);
  return form;
}

export default function DeliveryAddressCard({ control }: Readonly<{ control: Control<ShipToValues> }>) {
  const { t } = useTranslation();
  return (
    <Card data-testid="gift-card-delivery-address" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Typography sx={{ fontWeight: 700 }}>{t('mweb.giftCards.deliveryAddressTitle')}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('mweb.giftCards.deliveryAddressHint')}
        </Typography>
        <RhfTextField control={control} name="name" label={t('mweb.brandOrders.recipientName')} required autoComplete="name" size="small" />
        <RhfTextField control={control} name="phone" label={t('mweb.brandOrders.phone')} required autoComplete="tel" size="small" />
        <AddressFields control={control} names={ADDRESS_NAMES} size="small" required />
      </Stack>
    </Card>
  );
}
