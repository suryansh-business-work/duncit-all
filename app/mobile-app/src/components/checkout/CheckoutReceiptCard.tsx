import { YStack } from 'tamagui';

import { Row } from '@/components/checkout/SuccessParts';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { formatMoney } from '@/utils/checkout-math';
import { formatDateTime } from '@/utils/date-format';

/** The payment fields the receipt reads. The multi-ticket discount is optional
 * because the product checkout shares this screen and never carries one. */
export interface ReceiptPayment {
  total: number;
  currency_symbol: string;
  paid_at?: string | null;
  created_at?: string | null;
  invoice_no?: string | null;
  ticket_discount_amount?: number | null;
  ticket_discount_pct?: number | null;
}

function Divider() {
  return <YStack height={1} backgroundColor="$borderColor" />;
}

/**
 * The success screen's receipt: amount paid, the multi-ticket discount frozen
 * on the payment (only when one was taken), when it was paid and the invoice
 * number. mWeb twin: CheckoutSuccess's receipt (same test ids, rule 27).
 */
export function CheckoutReceiptCard({ payment }: Readonly<{ payment: ReceiptPayment }>) {
  const { t } = useTranslation();
  const ticketDiscount = Number(payment.ticket_discount_amount ?? 0);
  return (
    <SurfaceCard alignSelf="stretch" gap={10}>
      <Row
        label={t('mweb.checkout.amountPaid')}
        value={formatMoney(payment.currency_symbol, payment.total)}
        bold
      />
      {ticketDiscount > 0 ? (
        <YStack testID="checkout-success-ticket-discount" gap={10}>
          <Divider />
          <Row
            label={t('mweb.checkout.ticketDiscountSaved')}
            value={`− ${formatMoney(payment.currency_symbol, ticketDiscount)}`}
          />
        </YStack>
      ) : null}
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
