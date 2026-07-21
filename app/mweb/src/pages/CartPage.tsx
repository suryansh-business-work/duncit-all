import { useMemo } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useNavigate } from 'react-router-dom';
import { useCart, cartLineKey, type CartLine } from '../components/cart/CartContext';
import { usePricing } from '../hooks/usePricing';
import { parseSelectionKey } from '../utils/product-selection';
import CartPodGroup from './cart-page/CartPodGroup';

/** The cart — every product added from any Pod Shop, grouped by pod. Checkout
 * runs per pod group (products are purchased with that pod's booking). */
export default function CartPage() {
  const { lines, setLine, removeLine, clearPod } = useCart();
  const { format: priceFormat } = usePricing();
  const navigate = useNavigate();

  const groups = useMemo(() => {
    const byPod = new Map<string, CartLine[]>();
    for (const line of lines) {
      const arr = byPod.get(line.pod_id) ?? [];
      arr.push(line);
      byPod.set(line.pod_id, arr);
    }
    return Array.from(byPod.entries());
  }, [lines]);

  const checkoutPod = (podId: string, podLines: CartLine[]) => {
    navigate(`/checkout/${podId}`, {
      state: {
        pod_title: podLines[0]?.pod_title ?? '',
        selected_products: podLines.map((line) => ({
          ...parseSelectionKey(cartLineKey(line)),
          quantity: line.quantity,
          unit_cost: line.unit_cost,
        })),
      },
    });
  };

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
        <Button variant="contained" onClick={() => navigate('/')} sx={{ borderRadius: 999, fontWeight: 800 }}>
          Find a pod
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2} sx={{ py: 1 }}>
      <Typography variant="h5" sx={{ fontWeight: 950 }}>
        Cart
      </Typography>
      {groups.map(([podId, podLines]) => (
        <CartPodGroup
          key={podId}
          podId={podId}
          podTitle={podLines[0]?.pod_title ?? 'Pod'}
          lines={podLines}
          priceFormat={priceFormat}
          onSetQuantity={(line, quantity) =>
            setLine({ ...line }, quantity)
          }
          onRemove={(line) => removeLine(podId, cartLineKey(line))}
          onCheckout={() => checkoutPod(podId, podLines)}
        />
      ))}
      <Button
        variant="text"
        color="error"
        onClick={() => groups.forEach(([podId]) => clearPod(podId))}
        sx={{ alignSelf: 'center', fontWeight: 800 }}
      >
        Clear cart
      </Button>
    </Stack>
  );
}
