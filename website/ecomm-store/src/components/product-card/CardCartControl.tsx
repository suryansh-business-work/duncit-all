import { useState } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';
import { CartControlNoticeChip, CartQuantityControl, useCartControlNotice } from '@duncit/ui';
import type { CartControlLabels } from '@duncit/utils';

import type { StoreProductCard } from '../../graphql/catalog';
import { useCart } from '../../app/providers/CartProvider';
import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import { useCartControlLabels } from '../cart/useCartControlLabels';

const NOTICE_CENTRED = { top: '50%', transform: 'translate(-50%, -50%)' } as const;

/** The cart line holding exactly what the card shows — for a product with options, the variant it prices. */
function useCardLine(product: StoreProductCard) {
  const { cart } = useCart();
  return cart?.lines.find((line) => line.product_id === product.id && line.variant_id === product.lead_variant_id);
}

interface CardCartProps {
  product: StoreProductCard;
  sx?: SxProps<Theme>;
}

/**
 * The card's cart control: a round "+" that becomes the bin / count / "+" pill
 * once the product is in the cart, stepping the cart line in place. The cart
 * drawer stays shut — the notice over the photo is the feedback. Held `busy`
 * while a change is in flight so a double tap cannot add two. Absent when the
 * product is out of stock.
 */
export function CardCartControl({ product, sx }: Readonly<CardCartProps>) {
  const { addToCart, setQty } = useCart();
  const settings = useStoreSettings();
  const labels = useCartControlLabels(product.title);
  const line = useCardLine(product);
  const [busy, setBusy] = useState(false);
  if (!product.in_stock) return null;

  const change = async (next: number) => {
    setBusy(true);
    try {
      // Both report their own failure (toast) and resolve false.
      if (line) await setQty(product.id, product.lead_variant_id, next);
      else await addToCart(product.id, product.lead_variant_id, next, { openDrawer: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <CartQuantityControl
      quantity={line?.quantity ?? 0}
      // Once in the cart the line carries the server's own limit (order cap and stock).
      max={line ? line.max_qty : settings.max_qty_per_line}
      labels={labels}
      onChange={change}
      busy={busy}
      testIdPrefix="product-card"
      sx={sx}
    />
  );
}

function Notice({ quantity, labels }: Readonly<{ quantity: number; labels: CartControlLabels }>) {
  const notice = useCartControlNotice(quantity);
  return <CartControlNoticeChip notice={notice} labels={labels} testId="product-card-notice" sx={NOTICE_CENTRED} />;
}

/**
 * "Item added" / "Item removed" over the card's photo. Mounted only once the
 * cart has loaded: a product already in the cart was not just added.
 */
export function CardCartNotice({ product }: Readonly<{ product: StoreProductCard }>) {
  const { loading } = useCart();
  const labels = useCartControlLabels(product.title);
  const line = useCardLine(product);
  if (loading) return null;
  return <Notice quantity={line?.quantity ?? 0} labels={labels} />;
}
