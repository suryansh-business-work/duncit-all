import { Box, Paper, Stack, Typography } from '@mui/material';

import { useCart } from '../../app/providers/CartProvider';
import { CartLines } from '../../components/cart/CartContents';
import { CartSummary } from '../../components/cart/CartSummary';
import { usePageSeo } from '../../lib/usePageSeo';
import { useStoreT } from '../../i18n';

/** /cart — the lines on the left, totals and checkout on the right (below on a phone). */
export function CartPage() {
  const { t } = useStoreT();
  const { cart } = useCart();
  usePageSeo(t('ecommStore.cart.title'));
  const hasLines = (cart?.lines.length ?? 0) > 0;
  return (
    <Stack spacing={2}>
      <Typography variant="h1">{t('ecommStore.cart.title')}</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Paper sx={{ flexGrow: 1, width: '100%', px: 2 }}>
          <CartLines />
        </Paper>
        {cart && hasLines ? (
          <Box sx={{ width: { xs: '100%', md: 380 }, flexShrink: 0, position: { md: 'sticky' }, top: { md: 180 } }}>
            <Paper sx={{ p: 2 }}>
              <CartSummary cart={cart} />
            </Paper>
          </Box>
        ) : null}
      </Stack>
    </Stack>
  );
}
