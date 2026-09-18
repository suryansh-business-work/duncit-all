import { Link as RouterLink } from 'react-router';
import { Alert, Divider, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';

import type { StoreCart } from '../../graphql/cart';
import { useMoney } from '../../lib/money';
import { paths } from '../../lib/paths';
import { useStoreT } from '../../i18n';
import { CouponForm } from './coupon-form';
import { FreeShippingBar } from './FreeShippingBar';

function Row({ label, value, tone }: Readonly<{ label: string; value: string; tone?: 'success.main' }>) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
      <Typography variant="body2">{label}</Typography>
      <Typography variant="body2" color={tone} sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Stack>
  );
}

interface CartSummaryProps {
  cart: StoreCart;
  onCheckout?: () => void;
}

/** Totals, savings, the coupon, free-delivery progress and the checkout button. */
export function CartSummary({ cart, onCheckout }: Readonly<CartSummaryProps>) {
  const { t } = useStoreT();
  const money = useMoney();
  const belowMinimum = cart.min_order_value > 0 && cart.items_total < cart.min_order_value;
  const blocked = belowMinimum || cart.has_issues || cart.item_count === 0;
  const payable = Math.max(0, cart.items_total - cart.coupon_discount);
  return (
    <Stack spacing={1.5}>
      <FreeShippingBar cart={cart} />
      <CouponForm cart={cart} />
      <Divider />
      <Row label={t('ecommStore.cart.itemsTotal')} value={money(cart.items_total)} />
      {cart.savings > 0 ? (
        <Row label={t('ecommStore.cart.savings')} value={money(cart.savings)} tone="success.main" />
      ) : null}
      {cart.coupon_discount > 0 ? (
        <Row label={t('ecommStore.cart.couponDiscount')} value={`-${money(cart.coupon_discount)}`} tone="success.main" />
      ) : null}
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Typography sx={{ fontWeight: 800 }}>{t('ecommStore.cart.subtotal')}</Typography>
        <Typography sx={{ fontWeight: 800 }}>{money(payable)}</Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {t('ecommStore.cart.shippingAtCheckout')}
      </Typography>
      {belowMinimum ? (
        <Alert severity="info">
          {t('ecommStore.cart.minOrder', { vars: { amount: money(cart.min_order_value) } })}
        </Alert>
      ) : null}
      {cart.has_issues ? <Alert severity="warning">{t('ecommStore.cart.fixIssues')}</Alert> : null}
      <DuncitButton
        component={RouterLink}
        to={paths.checkout}
        variant="contained"
        size="large"
        fullWidth
        disabled={blocked}
        onClick={onCheckout}
      >
        {t('ecommStore.cart.checkout')}
      </DuncitButton>
    </Stack>
  );
}
