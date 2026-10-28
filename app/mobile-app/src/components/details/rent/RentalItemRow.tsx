import { Text, XStack, YStack } from 'tamagui';
import {
  rentalMoney,
  rentalUnitKey,
  type PodRentalCatalogue,
  type PodRentalItem,
} from '@duncit/utils';

import { CartQuantityControl } from '@/components/cart/CartQuantityControl';
import { cartControlLabels } from '@/components/cart/cartControlLabels';
import { useTranslation } from '@/hooks/useTranslation';

import { ProductRowShell, ProductThumb } from '../PodShopProductRow/ProductRowParts';

import { RentalLineBreakdown } from './RentalLineBreakdown';

interface Props {
  item: PodRentalItem;
  /** The currency every price prints in, and the pod's chargeable hours for the price breakdown. */
  catalogue: Pick<PodRentalCatalogue, 'currency_symbol' | 'hours'>;
  quantity: number;
  /** The most this booking may take: the per-guest limit for every seat, never past what is left. */
  max: number;
  /** Renting closed for the pod: the row is a listing only. */
  readOnly: boolean;
  /** Renting is open, but not to this viewer: the picker shows, greyed out. */
  disabled?: boolean;
  onQuantity: (itemId: string, quantity: number) => void;
}

/** One thing the venue rents: photo, name, rate per slot or hour, deposit, what is left, and the picker. RN twin of mWeb's RentalItemRow. */
export function RentalItemRow({
  item,
  catalogue,
  quantity,
  max,
  readOnly,
  disabled = false,
  onQuantity,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const currency = catalogue.currency_symbol;
  const labels = cartControlLabels(t, item.name);
  const soldOut = item.available <= 0;
  const selected = !readOnly && quantity > 0;
  // The venue's per-guest limit, not the stock, is what stops the + here: say so.
  const capped = max > 0 && max < item.available;
  const stock = soldOut
    ? t('venueRentals.guest.soldOut')
    : t('venueRentals.guest.left', { vars: { count: item.available } });
  const deposit =
    item.deposit > 0
      ? ` · ${t('venueRentals.guest.deposit', { vars: { amount: rentalMoney(currency, item.deposit) } })}`
      : '';
  return (
    <ProductRowShell testID={`pod-rent-row-${item.id}`} selected={selected}>
      <ProductThumb image={item.images[0] ?? ''} />
      <YStack flex={1} gap={2}>
        <Text fontSize={14} fontWeight="600" color="$color">
          {item.name}
        </Text>
        <Text fontSize={12} color="$muted">
          {stock}
          {deposit}
        </Text>
        {!readOnly && (!soldOut || quantity > 0) ? (
          <XStack marginTop={6}>
            <CartQuantityControl
              quantity={quantity}
              max={max}
              labels={labels}
              size="sm"
              disabled={disabled}
              onChange={(next) => onQuantity(item.id, next)}
              testIdPrefix={`pod-rent-${item.id}`}
            />
          </XStack>
        ) : null}
        {!readOnly && !disabled && !soldOut && capped ? (
          <Text fontSize={12} color="$muted" testID={`pod-rent-max-${item.id}`}>
            {t('venueRentals.guest.maxPerBooking', { vars: { count: max } })}
          </Text>
        ) : null}
        {selected ? (
          <RentalLineBreakdown item={item} quantity={quantity} catalogue={catalogue} />
        ) : null}
      </YStack>
      <Text fontSize={13.5} fontWeight="700" color="$color">
        {t('venueRentals.guest.rate', {
          vars: { amount: rentalMoney(currency, item.rate), unit: t(rentalUnitKey(item.unit)) },
        })}
      </Text>
    </ProductRowShell>
  );
}
