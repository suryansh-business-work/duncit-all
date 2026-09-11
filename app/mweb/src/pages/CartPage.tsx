import { useMemo } from 'react';
import { Box, Card, Stack, Typography } from '@mui/material';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { alpha } from '@mui/material/styles';
import { DuncitButton } from '@duncit/buttons';
import { useNavigate } from 'react-router';
import { useCart, cartLineKey, type CartLine } from '../components/cart/CartContext';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { STICKY_BAR_SX } from '../components/cart/stickyBarSx';
import { usePricing } from '../hooks/usePricing';
import { useTranslation } from '../i18n/useTranslation';
import CartPodGroup from './cart-page/CartPodGroup';

/** The cart — every product added from any Pod Shop, grouped by pod. The WHOLE
 * cart checks out as ONE standalone PRODUCT payment (separate from any pod
 * booking) via the combined product checkout. */
export default function CartPage() {
  const { t } = useTranslation();
  const { lines, setLine, removeLine, clearAll } = useCart();
  const { format: priceFormat } = usePricing();
  const navigate = useNavigate();

  const groups = useMemo(() => {
    const byPod = new Map<string, { title: string; lines: CartLine[] }>();
    for (const line of lines) {
      const group = byPod.get(line.pod_id) ?? { title: line.pod_title, lines: [] };
      group.lines.push(line);
      byPod.set(line.pod_id, group);
    }
    return Array.from(byPod.entries());
  }, [lines]);

  const grandTotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.unit_cost * line.quantity, 0),
    [lines],
  );

  if (groups.length === 0) {
    return (
      <Stack spacing={2} sx={{ py: 0.5 }}>
        <PageHeader title={t('mweb.cart.title')} />
        <EmptyState
          icon={<ShoppingCartOutlinedIcon />}
          title={t('mweb.cart.empty')}
          actionLabel={t('mweb.cart.exploreShop')}
          onAction={() => navigate('/shop')}
        />
      </Stack>
    );
  }

  return (
    <Stack spacing={2} sx={{ py: 0.5 }}>
      <PageHeader title={t('mweb.cart.title')} />
      {groups.map(([podId, group]) => (
        <CartPodGroup
          key={podId}
          podId={podId}
          podTitle={group.title}
          lines={group.lines}
          priceFormat={priceFormat}
          onSetQuantity={(line, quantity) => setLine(line, quantity)}
          onRemove={(line) => removeLine(podId, cartLineKey(line))}
        />
      ))}
      <Card sx={{ p: 2 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('mweb.cart.total')}
          </Typography>
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 700 }}>{priceFormat(grandTotal)}</Typography>
        </Stack>
      </Card>
      <DuncitButton variant="text" color="error" onClick={clearAll} sx={{ alignSelf: 'center' }}>
        {t('mweb.cart.clear')}
      </DuncitButton>
      {/* The whole cart pays in ONE product payment — delivery is quoted per
          warehouse on the checkout, but there is a single Pay. The CTA stays
          pinned above the bottom nav while the lines scroll. */}
      <Box sx={STICKY_BAR_SX}>
        <DuncitButton
          variant="contained"
          size="large"
          fullWidth
          onClick={() => navigate('/product-checkout')}
          sx={{ boxShadow: (theme) => `0 10px 28px ${alpha(theme.palette.common.black, 0.16)}` }}
        >
          {t('mweb.cart.checkout')}
        </DuncitButton>
      </Box>
    </Stack>
  );
}
