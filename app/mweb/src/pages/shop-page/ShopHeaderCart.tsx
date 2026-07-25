import { Badge, IconButton } from '@mui/material';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../components/cart/CartContext';

/** Non-floating cart entry point shown in the Pod Shop header (top-right) — the
 * floating cart button is hidden on the shop page in favour of this. */
export default function ShopHeaderCart() {
  const { totalCount } = useCart();
  const navigate = useNavigate();
  return (
    <IconButton
      aria-label={`Open cart (${totalCount} items)`}
      onClick={() => navigate('/cart')}
      sx={{ bgcolor: 'action.hover' }}
    >
      <Badge badgeContent={totalCount} color="error" max={99}>
        <ShoppingCartRoundedIcon />
      </Badge>
    </IconButton>
  );
}
