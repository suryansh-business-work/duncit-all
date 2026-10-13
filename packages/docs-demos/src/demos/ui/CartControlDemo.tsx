import { useEffect, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { CartControlNoticeChip, CartQuantityControl, useCartControlNotice } from '@duncit/ui';
import { formatMoney, type CartControlLabels } from '@duncit/utils';
import { defineDemo } from '../../types';

interface CartControlMock {
  product_name: string;
  unit_cost: number;
  quantity: number;
  stock: number;
  busy: boolean;
  size: 'small' | 'medium';
}

/** The words a surface hands the control — mWeb builds them from `mweb.cartControl.*`. */
const labelsFor = (name: string): CartControlLabels => ({
  add: `Add ${name}`,
  increase: `Add one more ${name}`,
  decrease: `Remove one ${name}`,
  remove: `Remove ${name}`,
  quantity: `${name} quantity`,
  added: 'Item added',
  removed: 'Item removed',
});

/**
 * A product card the way mWeb and the store hold the control: the card owns the
 * quantity (here a `useState`, in an app the cart), places the control in its
 * corner and the notice over its image.
 */
function CartControlDemo({ mock }: Readonly<{ mock: CartControlMock }>) {
  const [quantity, setQuantity] = useState(mock.quantity);
  useEffect(() => {
    setQuantity(mock.quantity);
  }, [mock.quantity]);
  const notice = useCartControlNotice(quantity);
  const labels = labelsFor(mock.product_name);
  return (
    <Paper variant="outlined" sx={{ position: 'relative', width: 200, p: 1 }}>
      <Box sx={{ position: 'relative', aspectRatio: '1 / 1', bgcolor: 'action.hover' }}>
        <CartControlNoticeChip notice={notice} labels={labels} />
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 600, pt: 1 }}>
        {mock.product_name}
      </Typography>
      <Typography sx={{ fontWeight: 700, minHeight: 36, display: 'flex', alignItems: 'center' }}>
        {formatMoney(mock.unit_cost)}
      </Typography>
      <CartQuantityControl
        quantity={quantity}
        max={mock.stock}
        labels={labels}
        onChange={setQuantity}
        busy={mock.busy}
        size={mock.size}
        testIdPrefix="demo-cart"
        sx={{ position: 'absolute', right: 8, bottom: 8 }}
      />
    </Paper>
  );
}

export const cartControlDemo = defineDemo<CartControlMock>({
  id: 'cart-control',
  title: 'CartQuantityControl — the one add-to-cart control on a product card',
  note:
    'Press the round + and the same spot becomes a pill: a bin while one is in the cart, a minus from two up, and a + that stops at stock. The dark notice over the image appears only when the product goes in or comes out. Set stock to 0 and even the + is off; set busy to true and taps are ignored without anything moving or losing focus.',
  mock: { product_name: 'Masala Chai', unit_cost: 149, quantity: 0, stock: 4, busy: false, size: 'medium' },
  render: (mock) => <CartControlDemo mock={mock} />,
});
