import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import AddShoppingCartRoundedIcon from '@mui/icons-material/AddShoppingCartRounded';
import RemoveShoppingCartOutlinedIcon from '@mui/icons-material/RemoveShoppingCartOutlined';
import { DuncitButton } from '@duncit/buttons';
import { CartControlNoticeChip, CartQuantityControl, useCartControlNotice } from '@duncit/ui';
import type { CartControlLabels } from '@duncit/utils';

import type { StoreProductCard } from '../../graphql/catalog';
import { useCart } from '../../app/providers/CartProvider';
import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';
import { useCartControlLabels } from '../cart/useCartControlLabels';

const NOTICE_CENTRED = { top: '50%', transform: 'translate(-50%, -50%)' } as const;

/** The quantity pill stretched to the card's width: bin/minus left, count centred, plus right. */
const FULL_WIDTH_PILL = { display: 'flex', width: '100%', height: 44, borderRadius: T.radius.pill, justifyContent: 'space-between', px: 0.5 } as const;

/** The cart line holding exactly what the card shows; for a product with options, the variant it prices. */
function useCardLine(product: StoreProductCard) {
  const { cart } = useCart();
  return cart?.lines.find((line) => line.product_id === product.id && line.variant_id === product.lead_variant_id);
}

/**
 * The card's full-width cart control: "Add to cart" until the product is in
 * the cart, then the bin / count / "+" pill stepping that line in place. The
 * cart drawer stays shut; the notice over the photo is the feedback. Held
 * `busy` while a change is in flight so a double tap cannot add two. Swapping
 * one control for the other hands keyboard focus across instead of dropping
 * it. Out of stock: a disabled "Out of stock" button.
 */
export function CardCartControl({ product }: Readonly<{ product: StoreProductCard }>) {
  const { t } = useStoreT();
  const { addToCart, setQty } = useCart();
  const settings = useStoreSettings();
  const labels = useCartControlLabels(product.title);
  const line = useCardLine(product);
  const [busy, setBusy] = useState(false);
  const shell = useRef<HTMLDivElement>(null);
  const handOff = useRef(false);
  const inCart = Boolean(line);

  useEffect(() => {
    if (!handOff.current) return;
    handOff.current = false;
    const buttons = Array.from(shell.current?.querySelectorAll('button') ?? []);
    buttons.at(-1)?.focus();
  }, [inCart]);

  if (!product.in_stock) {
    return (
      <DuncitButton fullWidth variant="contained" disabled startIcon={<RemoveShoppingCartOutlinedIcon />}>
        {t('ecommStore.card.outOfStock')}
      </DuncitButton>
    );
  }

  const change = async (next: number) => {
    if (busy) return;
    setBusy(true);
    // Adding the first unit or taking the last away swaps the control under the focus.
    handOff.current = !line || next === 0;
    try {
      // Both report their own failure (toast) and resolve false, and then nothing swaps.
      const done = line
        ? await setQty(product.id, product.lead_variant_id, next)
        : await addToCart(product.id, product.lead_variant_id, next, { openDrawer: false });
      if (!done) handOff.current = false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box ref={shell}>
      {line ? (
        <CartQuantityControl
          quantity={line.quantity}
          // Once in the cart the line carries the server's own limit (order cap and stock).
          max={line.max_qty}
          labels={labels}
          onChange={change}
          busy={busy}
          testIdPrefix="product-card"
          sx={FULL_WIDTH_PILL}
        />
      ) : (
        <DuncitButton
          fullWidth
          variant="contained"
          startIcon={<AddShoppingCartRoundedIcon />}
          aria-label={t('ecommStore.card.addNamed', { vars: { name: product.title } })}
          aria-disabled={busy || undefined}
          // Nothing may be bought when the per-line cap is zero.
          disabled={settings.max_qty_per_line <= 0}
          onClick={() => change(1)}
          data-testid="product-card-add"
        >
          {t('ecommStore.product.addToCart')}
        </DuncitButton>
      )}
    </Box>
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
