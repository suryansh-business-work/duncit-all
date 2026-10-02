import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { cartLineKey, type CartLine } from '@/stores/cart.store';
import type { ProductShippingQuote } from '@/hooks/useProductShippingQuote';
import type { CheckoutBreakup } from '@/utils/checkout-math';
import { formatMoney } from '@/utils/checkout-math';
import type { CoinCheckoutSummary } from '@duncit/utils';
import { CoinSummaryRows } from '@/components/checkout/CoinSummaryRows';

import { DeliveryRows } from './DeliveryRows';
import { ProductLineRow } from './ProductLineRow';
import { Row } from './SummaryRow';

interface Props {
  lines: CartLine[];
  breakup: CheckoutBreakup;
  /** Coins spent, left and earned on this bill. Absent hides the coin block. */
  coins?: CoinCheckoutSummary | null;
  subtotal: number;
  quote: ProductShippingQuote | null;
  shippingLoading: boolean;
  pincodeValid: boolean;
  /** Opens the product-detail sheet for a line. Products and pods are separate
   * entities — the checkout lists products only, each with an info button. */
  onInfo: (productId: string) => void;
}

/** Product-only order summary for the combined product checkout: a flat product
 * line list (each with an info button), products subtotal, one live delivery row
 * per warehouse group (ShipRocket) with a delivery total, and the payable total.
 * No pod title / ticket line — pods and products are separate entities and never
 * share a payment. RN twin of mWeb's ProductOrderSummaryCard. */
export function ProductOrderSummary({
  lines,
  breakup,
  subtotal,
  quote,
  shippingLoading,
  pincodeValid,
  onInfo,
  coins = null,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const fmt = (value: number) => formatMoney(breakup.currency, value);
  const estimated = !!quote && !quote.all_quoted;

  return (
    <YStack
      testID="product-order-summary"
      borderRadius={24}
      borderWidth={1}
      borderColor="$cardBorder"
      backgroundColor="$surface"
      padding={16}
      gap={8}
    >
      <XStack gap={8} alignItems="center">
        <MaterialIcons name="shopping-bag" size={20} color={accent} />
        <YStack flex={1} minWidth={0}>
          <Text fontSize={11} fontWeight="600" textTransform="uppercase" color="$muted">
            {t('mweb.checkout.orderSummary')}
          </Text>
          <Text fontSize={16} fontWeight="700" color="$color" numberOfLines={1}>
            {t('mweb.checkout.yourOrder')}
          </Text>
        </YStack>
      </XStack>
      <YStack height={1} backgroundColor="$borderColor" marginVertical={4} />
      <YStack gap={6}>
        {lines.map((line) => (
          <ProductLineRow
            key={`${line.pod_id}:${cartLineKey(line)}`}
            line={line}
            value={fmt(line.unit_cost * line.quantity)}
            onInfo={onInfo}
          />
        ))}
      </YStack>
      <YStack height={1} backgroundColor="$borderColor" marginVertical={4} />
      <Row label={t('mweb.checkout.subtotal')} value={fmt(subtotal)} />
      <DeliveryRows
        quote={quote}
        shippingLoading={shippingLoading}
        pincodeValid={pincodeValid}
        currency={breakup.currency}
      />
      {estimated ? (
        <Text testID="product-shipping-estimated" fontSize={11.5} color="$muted">
          {t('mweb.checkout.deliveryEstimatedNote')}
        </Text>
      ) : null}
      <Row
        label={t('mweb.checkout.gst', { vars: { pct: breakup.gstPct } })}
        value={fmt(breakup.gst)}
      />
      <YStack height={1} backgroundColor="$borderColor" marginVertical={4} />
      <Row label={t('mweb.checkout.totalPayable')} value={fmt(breakup.total)} bold />
      <CoinSummaryRows coins={coins} />
    </YStack>
  );
}
