import { Card, Divider, Stack, Typography } from '@mui/material';
import { formatMoney } from '@duncit/utils';
import type { GiftCardPurchaseTotals } from '@duncit/forms/schemas';
import { useTranslation } from '../../i18n/useTranslation';

interface Row {
  testId: string;
  label: string;
  value: string;
  bold?: boolean;
}

function TotalRow({ testId, label, value, bold = false }: Readonly<Row>) {
  return (
    <Stack data-testid={testId} direction="row" sx={{ justifyContent: 'space-between' }}>
      <Typography sx={{ fontWeight: bold ? 700 : 500, color: bold ? 'text.primary' : 'text.secondary' }}>{label}</Typography>
      <Typography data-testid={`${testId}-value`} sx={{ fontWeight: bold ? 700 : 600 }}>
        {value}
      </Typography>
    </Stack>
  );
}

/**
 * What the order costs, as the server will charge it: every card's value, and
 * the delivery fee once on a printed order — never per card, never waived.
 * The buy tab and the checkout both show it.
 */
export default function OrderTotalCard({ totals, currencySymbol }: Readonly<{ totals: GiftCardPurchaseTotals; currencySymbol: string }>) {
  const { t } = useTranslation();
  const money = (n: number) => formatMoney(n, { symbol: currencySymbol });
  return (
    <Card data-testid="gift-card-order-total" sx={{ p: 2 }}>
      <Stack spacing={1}>
        <TotalRow
          testId="gift-card-total-cards"
          label={t('mweb.giftCards.totalCards', { vars: { n: totals.quantity, amount: money(totals.amount) } })}
          value={money(totals.cardsValue)}
        />
        {totals.shippingFee > 0 && (
          <TotalRow testId="gift-card-total-delivery" label={t('mweb.giftCards.totalDelivery')} value={money(totals.shippingFee)} />
        )}
        <Divider />
        <TotalRow testId="gift-card-total" bold label={t('mweb.giftCards.checkoutTotal')} value={money(totals.total)} />
      </Stack>
    </Card>
  );
}
