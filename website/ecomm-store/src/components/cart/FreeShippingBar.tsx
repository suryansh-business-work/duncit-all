import { LinearProgress, Stack, Typography } from '@mui/material';

import type { StoreCart } from '../../graphql/cart';
import { useMoney } from '../../lib/money';
import { useStoreT } from '../../i18n';

/** How far the basket is from free delivery. Hidden when the store offers none. */
export function FreeShippingBar({ cart }: Readonly<{ cart: StoreCart }>) {
  const { t } = useStoreT();
  const money = useMoney();
  if (cart.free_shipping_above <= 0) return null;
  const reached = cart.amount_to_free_shipping <= 0;
  const progress = Math.min(100, Math.round((cart.items_total / cart.free_shipping_above) * 100));
  const message = reached
    ? t('ecommStore.cart.freeShippingReached')
    : t('ecommStore.cart.freeShippingRemaining', { vars: { amount: money(cart.amount_to_free_shipping) } });
  return (
    <Stack spacing={0.75}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {message}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={progress}
        color={reached ? 'success' : 'primary'}
        aria-label={t('ecommStore.cart.freeShippingProgress')}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Stack>
  );
}
