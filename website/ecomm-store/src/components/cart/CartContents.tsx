import { Link as RouterLink } from 'react-router';
import { Divider, Stack } from '@mui/material';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import { DuncitButton } from '@duncit/buttons';
import { Loader } from '@duncit/ui';

import { useCart } from '../../app/providers/CartProvider';
import { paths } from '../../lib/paths';
import { useStoreT } from '../../i18n';
import { EmptyState } from '../EmptyState';
import { CartLineRow } from './CartLineRow';

/** The cart's lines, or the empty state. Shared by the drawer and the /cart page. */
export function CartLines({ onNavigate }: Readonly<{ onNavigate?: () => void }>) {
  const { t } = useStoreT();
  const { cart, loading } = useCart();
  if (!cart && loading) return <Loader label={t('ecommStore.cart.loading')} />;
  if (!cart || cart.lines.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBagOutlinedIcon />}
        title={t('ecommStore.cart.emptyTitle')}
        body={t('ecommStore.cart.emptyBody')}
        action={
          <DuncitButton component={RouterLink} to={paths.shop} variant="contained" onClick={onNavigate}>
            {t('ecommStore.cart.startShopping')}
          </DuncitButton>
        }
      />
    );
  }
  return (
    <Stack component="ul" divider={<Divider component="li" aria-hidden />} sx={{ listStyle: 'none', p: 0, m: 0 }}>
      {cart.lines.map((line) => (
        <Stack component="li" key={`${line.product_id}:${line.variant_id}`}>
          <CartLineRow line={line} />
        </Stack>
      ))}
    </Stack>
  );
}
