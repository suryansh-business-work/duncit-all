import { YStack } from 'tamagui';
import type { PaymentRentalLine } from '@duncit/utils';

import { Row } from '@/components/checkout/SuccessParts';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { formatMoney } from '@/utils/checkout-math';
import { formatDateTime } from '@/utils/date-format';

/** The payment fields the receipt reads. The pod discounts are optional
 * because the product checkout shares this screen and never carries one. */
export interface ReceiptPayment {
  total: number;
  currency_symbol: string;
  paid_at?: string | null;
  created_at?: string | null;
  invoice_no?: string | null;
  ticket_discount_amount?: number | null;
  ticket_discount_pct?: number | null;
  /** What the buyer's unlocked Smart Incentive took off, frozen on the payment. */
  smart_incentive_amount?: number | null;
  smart_incentive_pct?: number | null;
  /** The rented items this booking carried, frozen at checkout. */
  rental_lines?: PaymentRentalLine[] | null;
}

function Divider() {
  return <YStack height={1} backgroundColor="$borderColor" />;
}

/** One discount frozen on the payment, as "− amount" — nothing when none was taken. */
function SavedRow({
  testID,
  label,
  amount,
  currency,
}: Readonly<{ testID: string; label: string; amount: number; currency: string }>) {
  if (amount <= 0) return null;
  return (
    <YStack testID={testID} gap={10}>
      <Divider />
      <Row label={label} value={`− ${formatMoney(currency, amount)}`} />
    </YStack>
  );
}

/**
 * The success screen's receipt: amount paid, the multi-ticket discount and the
 * Smart Incentive frozen on the payment (each only when one was taken), when it
 * was paid and the invoice number. mWeb twin: CheckoutSuccess's receipt (same
 * test ids, rule 27).
 */
export function CheckoutReceiptCard({ payment }: Readonly<{ payment: ReceiptPayment }>) {
  const { t } = useTranslation();
  return (
    <SurfaceCard alignSelf="stretch" gap={10}>
      <Row
        label={t('mweb.checkout.amountPaid')}
        value={formatMoney(payment.currency_symbol, payment.total)}
        bold
      />
      <SavedRow
        testID="checkout-success-ticket-discount"
        label={t('mweb.checkout.ticketDiscountSaved')}
        amount={Number(payment.ticket_discount_amount ?? 0)}
        currency={payment.currency_symbol}
      />
      <SavedRow
        testID="checkout-success-smart-incentive"
        label={t('mweb.smartIncentive.checkoutSaved')}
        amount={Number(payment.smart_incentive_amount ?? 0)}
        currency={payment.currency_symbol}
      />
      <Divider />
      <Row
        label={t('mweb.checkout.paidOn')}
        value={formatDateTime(payment.paid_at ?? payment.created_at)}
      />
      <Divider />
      <Row label={t('mweb.checkout.invoiceLabel')} value={payment.invoice_no ?? '—'} />
    </SurfaceCard>
  );
}
