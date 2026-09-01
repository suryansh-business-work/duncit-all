import { Badge, Stack, Typography } from '@mui/material';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import { DuncitIconButton } from '@duncit/buttons';
import { useLocation, useNavigate } from 'react-router';
import { CART_BADGE_MAX, deriveCartEntry } from '@duncit/utils';
import { useProductVisibility } from '@duncit/app-settings';
import { useTranslation } from '../../i18n/useTranslation';
import { useCart } from './CartContext';

/**
 * The app's single cart entry point — it lives in the app header, so it rides
 * along on every page instead of floating over the content. Hidden while the
 * cart is empty and on the cart flow itself.
 *
 * Twin of the native HeaderCartButton: both read `deriveCartEntry` from
 * @duncit/utils, so the badge, the visibility rule and the accessible name
 * cannot drift apart (rule 27).
 *
 * With the product system flag off there is nothing to buy, so the cart is not
 * an empty page to visit — the whole entry point goes, badge and caption with it.
 */
export default function HeaderCartButton({ label }: Readonly<{ label?: string }>) {
  const { t } = useTranslation();
  const { totalCount } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { visible: productsVisible } = useProductVisibility();
  const entry = deriveCartEntry(totalCount, pathname);
  if (!productsVisible) return null;
  // The caption ships inside the component so it hides together with the
  // button — a wrapper-provided label would float alone while the cart is empty.
  if (!entry.visible) return null;
  return (
    <Stack
      spacing={0.1}
      sx={{
        alignItems: "center",
        flex: '0 0 auto'
      }}>
      <DuncitIconButton
        aria-label={t('mweb.cart.open', { count: entry.count })}
        onClick={() => navigate('/cart')}
        sx={{ bgcolor: 'action.hover' }}
      >
        <Badge badgeContent={entry.count} color="error" max={CART_BADGE_MAX}>
          <ShoppingCartRoundedIcon />
        </Badge>
      </DuncitIconButton>
      {label && (
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', lineHeight: 1 }}>
          {label}
        </Typography>
      )}
    </Stack>
  );
}
