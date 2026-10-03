import { Box, Card, Stack, Typography } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { DuncitButton, DuncitRoundButton } from '@duncit/buttons';
import { wishlistKey } from '@duncit/utils';
import { useNavigate } from 'react-router';
import type { CartLineMeta } from '../../components/cart/CartContext';
import { useWishlist } from '../../components/cart/WishlistContext';
import EmptyState from '../../components/EmptyState';
import { usePricing } from '../../hooks/usePricing';
import { useTranslation } from '../../i18n/useTranslation';

interface RowProps {
  item: CartLineMeta;
  priceFormat: (amount: number) => string;
  onMoveToCart: (item: CartLineMeta) => void;
  onRemove: (item: CartLineMeta) => void;
}

/** One saved product: thumb, name, pod, unit price, Move to cart, remove. */
function WishlistRow({ item, priceFormat, onMoveToCart, onRemove }: Readonly<RowProps>) {
  const { t } = useTranslation();
  const key = wishlistKey(item);
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ py: 1.5, alignItems: 'flex-start', '& + &': { borderTop: 1, borderColor: 'divider' } }}
      data-testid={`wishlist-item-${key}`}
    >
      <Box sx={{ width: 64, height: 64, borderRadius: '12px', overflow: 'hidden', flex: '0 0 auto', bgcolor: 'action.hover' }}>
        {item.image_url && (
          <Box component="img" src={item.image_url} alt={item.product_name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </Box>
      <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.3 }}>
          {item.product_name}
          {item.variant_label ? ` — ${item.variant_label}` : ''}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
          {item.pod_title}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('mweb.cart.unitEach', { vars: { price: priceFormat(item.unit_cost) } })}
        </Typography>
        <DuncitButton
          variant="outlined"
          size="small"
          startIcon={<AddShoppingCartIcon />}
          aria-label={t('mweb.cart.moveToCartItem', { vars: { name: item.product_name } })}
          onClick={() => onMoveToCart(item)}
          sx={{ alignSelf: 'flex-start', mt: 0.5 }}
          data-testid={`wishlist-move-cart-${key}`}
        >
          {t('mweb.cart.moveToCart')}
        </DuncitButton>
      </Stack>
      <DuncitRoundButton
        tone="surface"
        aria-label={t('mweb.cart.removeFromWishlist', { vars: { name: item.product_name } })}
        onClick={() => onRemove(item)}
        sx={{ color: 'text.secondary' }}
        data-testid={`wishlist-remove-${key}`}
      >
        <DeleteOutlineIcon />
      </DuncitRoundButton>
    </Stack>
  );
}

/** The Wishlist tab — products moved out of the cart to buy later. Native
 * twin: components/cart/WishlistTab. */
export default function WishlistTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, moveToCart, remove } = useWishlist();
  const { format: priceFormat } = usePricing();

  if (items.length === 0) {
    return (
      <EmptyState
        testId="wishlist-empty"
        icon={<FavoriteBorderIcon />}
        title={t('mweb.cart.wishlistEmpty')}
        actionLabel={t('mweb.cart.exploreShop')}
        onAction={() => navigate('/shop')}
      />
    );
  }

  return (
    <Card sx={{ px: 2, py: 0.5 }} data-testid="wishlist-list">
      {items.map((item) => (
        <WishlistRow
          key={wishlistKey(item)}
          item={item}
          priceFormat={priceFormat}
          onMoveToCart={moveToCart}
          onRemove={remove}
        />
      ))}
    </Card>
  );
}
