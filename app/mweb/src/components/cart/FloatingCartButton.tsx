import { Badge, Fab } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from './CartContext';

/** Pages with their own cart entry point / flow, where the floating button would
 * be redundant or cover its own controls: the cart, both checkouts, and the Pod
 * Shop (which shows a cart button in its header). */
const HIDDEN_PATHS = new Set(['/cart', '/product-checkout', '/shop']);

/** Floating cart entry point — visible whenever the cart has items (hidden on
 * the cart/checkout/shop pages themselves). Mirrors the native FloatingCartButton. */
export default function FloatingCartButton() {
  const { totalCount } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const hidden = totalCount === 0 || HIDDEN_PATHS.has(pathname) || pathname.startsWith('/checkout');
  if (hidden) return null;
  return (
    <Fab
      color="primary"
      aria-label={`Open cart (${totalCount} items)`}
      onClick={() => navigate('/cart')}
      sx={{
        position: 'fixed',
        right: 16,
        bottom:
          'calc(var(--duncit-bottom-nav-overlay-offset, 88px) + 14px + var(--duncit-app-banner-offset, 0px))',
        zIndex: (theme) => theme.zIndex.appBar + 2,
      }}
    >
      <Badge badgeContent={totalCount} color="error" max={99}>
        <ShoppingCartIcon />
      </Badge>
    </Fab>
  );
}
