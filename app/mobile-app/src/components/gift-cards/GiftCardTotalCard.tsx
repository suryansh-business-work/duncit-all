import { Separator } from 'tamagui';
import type { GiftCardPurchaseTotals } from '@duncit/forms/schemas';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { formatMoney } from '@/utils/checkout-math';
import { GiftCardSummaryRow } from './GiftCardSummaryRow';

/**
 * What the order costs, as the server charges it: every card's value, and the
 * delivery fee once on a printed order — never per card, never waived. The buy
 * section and the checkout both show it. mWeb twin: OrderTotalCard.
 */
export function GiftCardTotalCard({
  totals,
  currency,
}: Readonly<{ totals: GiftCardPurchaseTotals; currency: string }>) {
  const { t } = useTranslation();
  return (
    <SurfaceCard gap={10} testID="gift-card-order-total">
      <GiftCardSummaryRow
        testID="gift-card-total-cards"
        label={t('mweb.giftCards.totalCards', {
          vars: { n: totals.quantity, amount: formatMoney(currency, totals.amount) },
        })}
        value={formatMoney(currency, totals.cardsValue)}
      />
      {totals.shippingFee > 0 ? (
        <GiftCardSummaryRow
          testID="gift-card-total-delivery"
          label={t('mweb.giftCards.totalDelivery')}
          value={formatMoney(currency, totals.shippingFee)}
        />
      ) : null}
      <Separator />
      <GiftCardSummaryRow
        testID="gift-card-total"
        bold
        label={t('mweb.giftCards.checkoutTotal')}
        value={formatMoney(currency, totals.total)}
      />
    </SurfaceCard>
  );
}
