import { Link as RouterLink } from 'react-router';
import { Alert, Divider, Link, Stack, Typography } from '@mui/material';

import type { StoreCheckoutQuote } from '../../../graphql/cart';
import { useMoney } from '../../../lib/money';
import { paths } from '../../../lib/paths';
import { useStoreT } from '../../../i18n';

function Row({ label, value, strong = false }: Readonly<{ label: string; value: string; strong?: boolean }>) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
      <Typography variant={strong ? 'body1' : 'body2'} sx={{ fontWeight: strong ? 800 : 400 }}>
        {label}
      </Typography>
      <Typography variant={strong ? 'body1' : 'body2'} sx={{ fontWeight: strong ? 800 : 600 }}>
        {value}
      </Typography>
    </Stack>
  );
}

interface DiscountLine {
  key: string;
  labelKey: string;
  amount: number;
}

/** Every line of the live quote: goods, discounts, shipping, COD fee, coins, GST, total. */
export function QuoteSummary({ quote }: Readonly<{ quote: StoreCheckoutQuote }>) {
  const { t } = useStoreT();
  const money = useMoney();
  const discounts: DiscountLine[] = [
    { key: 'coupon', labelKey: 'ecommStore.quote.coupon', amount: quote.coupon_discount },
    { key: 'prepaid', labelKey: 'ecommStore.quote.prepaid', amount: quote.prepaid_discount },
    { key: 'autoship', labelKey: 'ecommStore.quote.autoship', amount: quote.autoship_discount },
    { key: 'coins', labelKey: 'ecommStore.quote.coins', amount: quote.coins_redeemed },
  ];
  const shipping = quote.shipping_total > 0 ? money(quote.shipping_total) : t('ecommStore.quote.free');
  return (
    <Stack spacing={1} aria-live="polite">
      <Row label={t('ecommStore.quote.items', { count: quote.lines.length })} value={money(quote.items_total)} />
      {quote.savings > 0 ? <Row label={t('ecommStore.quote.mrpSavings')} value={`-${money(quote.savings)}`} /> : null}
      {discounts
        .filter((d) => d.amount > 0)
        .map((d) => (
          <Row key={d.key} label={t(d.labelKey)} value={`-${money(d.amount)}`} />
        ))}
      <Row label={t('ecommStore.quote.shipping')} value={shipping} />
      {quote.etd ? (
        <Typography variant="caption" color="text.secondary">
          {t('ecommStore.quote.etd', { vars: { etd: quote.etd } })}
        </Typography>
      ) : null}
      {quote.cod_fee > 0 ? <Row label={t('ecommStore.quote.codFee')} value={money(quote.cod_fee)} /> : null}
      <Divider />
      <Row label={t('ecommStore.quote.total')} value={money(quote.total)} strong />
      {quote.gst_amount > 0 ? (
        <Typography variant="caption" color="text.secondary">
          {t('ecommStore.quote.gstIncluded', { vars: { amount: money(quote.gst_amount) } })}
        </Typography>
      ) : null}
      {quote.coupon_error ? <Alert severity="warning">{quote.coupon_error}</Alert> : null}
      {quote.serviceable ? null : <Alert severity="error">{t('ecommStore.quote.notServiceable')}</Alert>}
      {quote.below_minimum ? <Alert severity="warning">{t('ecommStore.quote.belowMinimum')}</Alert> : null}
      {quote.has_issues ? (
        <Alert severity="warning">
          {t('ecommStore.quote.hasIssues')}{' '}
          <Link component={RouterLink} to={paths.cart}>
            {t('ecommStore.quote.reviewCart')}
          </Link>
        </Alert>
      ) : null}
    </Stack>
  );
}
