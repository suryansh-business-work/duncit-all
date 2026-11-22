import { Text } from 'tamagui';
import type { GiftCardDeliveryMode } from '@duncit/forms/schemas';

import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { formatMoney } from '@/utils/checkout-math';
import { GiftCardSegmented, type SegmentOption } from './GiftCardSegmented';

interface Props {
  value: GiftCardDeliveryMode;
  /** False while printed cards are switched off or out of stock. */
  physicalAvailable: boolean;
  shippingFee: number;
  currency: string;
  onChange: (next: GiftCardDeliveryMode) => void;
}

/** Email (codes arrive in an inbox) or printed cards by courier for a flat fee. mWeb twin: DeliveryModePicker. */
export function GiftCardDeliveryPicker({
  value,
  physicalAvailable,
  shippingFee,
  currency,
  onChange,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const options: SegmentOption<GiftCardDeliveryMode>[] = [
    {
      value: 'DIGITAL',
      label: t('mweb.giftCards.deliveryDigital'),
      testID: 'gift-card-delivery-digital',
    },
  ];
  if (physicalAvailable) {
    options.push({
      value: 'PHYSICAL',
      label: t('mweb.giftCards.deliveryPhysical'),
      testID: 'gift-card-delivery-physical',
    });
  }
  const caption =
    value === 'PHYSICAL'
      ? t('mweb.giftCards.deliveryPhysicalHint', {
          vars: { fee: formatMoney(currency, shippingFee) },
        })
      : t('mweb.giftCards.deliveryDigitalHint');

  return (
    <SurfaceCard gap={12} testID="gift-card-delivery-picker">
      <SectionHeader title={t('mweb.giftCards.deliveryHeading')} />
      <GiftCardSegmented options={options} value={value} onChange={onChange} />
      <Text testID="gift-card-delivery-caption" fontSize={12} color="$muted">
        {physicalAvailable ? caption : t('mweb.giftCards.physicalUnavailable')}
      </Text>
    </SurfaceCard>
  );
}
