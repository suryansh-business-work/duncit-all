import { Badge, IconButton } from '@mui/material';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import { useLocation, useNavigate } from 'react-router-dom';
import { CART_BADGE_MAX, deriveCartEntry } from '@duncit/utils';
import { useCart } from './CartContext';

/**
 * The app's single cart entry point — it lives in the app header, so it rides
 * along on every page instead of floating over the content. Hidden while the
 * cart is empty and on the cart flow itself.
 *
 * Twin of the native HeaderCartButton: both read `deriveCartEntry` from
 * @duncit/utils, so the badge, the visibility rule and the accessible name
 * cannot drift apart (rule 27).
 */
export default function HeaderCartButton() {
  const { totalCount } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const entry = deriveCartEntry(totalCount, pathname);
  if (!entry.visible) return null;
  return (
    <IconButton
      aria-label={entry.label}
      onClick={() => navigate('/cart')}
      sx={{ bgcolor: 'action.hover' }}
    >
      <Badge badgeContent={entry.count} color="error" max={CART_BADGE_MAX}>
        <ShoppingCartRoundedIcon />
      </Badge>
    </IconButton>
  );
}
