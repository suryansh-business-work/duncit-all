import { useMemo } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useNavigate } from 'react-router-dom';
import { useCart, cartLineKey, type CartLine } from '../components/cart/CartContext';
import { usePricing } from '../hooks/usePricing';
import CartPodGroup from './cart-page/CartPodGroup';

/** The cart — every product added from any Pod Shop, grouped by pod. The WHOLE
 * cart checks out as ONE standalone PRODUCT payment (separate from any pod
 * booking) via the combined product checkout. */
export default function CartPage() {
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
      <Stack alignItems="center" spacing={1.5} sx={{ py: 8, textAlign: 'center' }}>
        <ShoppingCartIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
        <Typography variant="h6" fontWeight={900}>
          Your cart is empty
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add products from any Pod Shop and they will wait for you here.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/shop')} sx={{ borderRadius: 999, fontWeight: 800 }}>
          Browse the Pod Shop
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2} sx={{ py: 1 }}>
      <Typography variant="h5" sx={{ fontWeight: 950 }}>
        Cart
      </Typography>
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
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          Cart total
        </Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
          {priceFormat(grandTotal)}
        </Typography>
      </Stack>
      {/* The whole cart pays in ONE product payment — delivery is quoted per
          warehouse on the checkout, but there is a single Pay. */}
      <Button
        variant="contained"
        onClick={() => navigate('/product-checkout')}
        sx={{ borderRadius: 999, fontWeight: 900 }}
      >
        Proceed to checkout
      </Button>
      <Button variant="text" color="error" onClick={clearAll} sx={{ alignSelf: 'center', fontWeight: 800 }}>
        Clear cart
      </Button>
    </Stack>
  );
}
