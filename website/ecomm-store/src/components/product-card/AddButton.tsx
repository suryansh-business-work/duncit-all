import { Link as RouterLink } from 'react-router';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { DuncitIconButton } from '@duncit/buttons';

import type { StoreProductCard } from '../../graphql/catalog';
import { useCart } from '../../app/providers/CartProvider';
import { paths } from '../../lib/paths';
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
 * The card's round "+": adds one straight to the cart, or — for a product
 * with options to choose — opens its page. Absent when it is out of stock.
 */
export function AddButton({ product }: Readonly<{ product: StoreProductCard }>) {
  const { t } = useStoreT();
  const { addToCart } = useCart();
  if (!product.in_stock) return null;
  if (product.has_variants) {
    return (
      <DuncitIconButton
        component={RouterLink}
        to={paths.product(product.slug)}
        aria-label={t('ecommStore.card.chooseOptionsNamed', { vars: { name: product.title } })}
        sx={ROUND_ADD}
      >
        <AddRoundedIcon />
      </DuncitIconButton>
    );
  }
  return (
    <DuncitIconButton
      aria-label={t('ecommStore.card.addNamed', { vars: { name: product.title } })}
      onClick={() => addToCart(product.id, '', 1)}
      sx={ROUND_ADD}
    >
      <AddRoundedIcon />
    </DuncitIconButton>
  );
}
