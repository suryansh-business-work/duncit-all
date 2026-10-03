import { useState } from 'react';
import AddShoppingCartRoundedIcon from '@mui/icons-material/AddShoppingCartRounded';
import { DuncitIconButton } from '@duncit/buttons';

import type { StoreProductCard } from '../../graphql/catalog';
import { useCart } from '../../app/providers/CartProvider';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';

const ROUND_ADD = {
  width: 44,
  height: 44,
  bgcolor: T.brand,
  color: T.onBrand,
  boxShadow: T.shadow,
  '&:hover': { bgcolor: T.cta },
} as const;

/**
 * The card's round cart button: adds one of exactly what the card shows to the
 * cart — for a product with options, the variant the card prices
 * (`lead_variant_id`). Disabled while the add is in flight so a double click
 * cannot add two. Absent when it is out of stock.
 */
export function AddButton({ product }: Readonly<{ product: StoreProductCard }>) {
  const { t } = useStoreT();
  const { addToCart } = useCart();
  const [adding, setAdding] = useState(false);
  if (!product.in_stock) return null;

  const add = async () => {
    setAdding(true);
    try {
      // addToCart reports its own failure (toast) and resolves false.
      await addToCart(product.id, product.lead_variant_id, 1);
    } finally {
      setAdding(false);
    }
  };

  return (
    <DuncitIconButton
      aria-label={t('ecommStore.card.addNamed', { vars: { name: product.title } })}
      data-testid="product-card-add-to-cart"
      disabled={adding}
      onClick={add}
      sx={ROUND_ADD}
    >
      <AddShoppingCartRoundedIcon />
    </DuncitIconButton>
  );
}
