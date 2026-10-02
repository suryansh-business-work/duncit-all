import { Box, Stack } from '@mui/material';
import { DuncitTabs, tabPanelProps, useTabParam } from '@duncit/tabs';
import PageHeader from '../components/PageHeader';
import { useTranslation } from '../i18n/useTranslation';
import CartTab from './cart-page/CartTab';
import WishlistTab from './cart-page/WishlistTab';
import { SEGMENTED_TABS_SX } from './gift-cards-page/segmentedSx';

type CartPageTab = 'cart' | 'wishlist';

/** The cart screen: the Cart (checked out as one product payment) and the
 * Wishlist (products moved out of the cart for later), selected by the URL's
 * tab param. Native twin: CartScreen. */
export default function CartPage() {
  const { t } = useTranslation();
  const tabs = useTabParam<CartPageTab>({
    items: [
      { value: 'cart', label: t('mweb.cart.tabCart'), testId: 'cart-tab-cart' },
      { value: 'wishlist', label: t('mweb.cart.tabWishlist'), testId: 'cart-tab-wishlist' },
    ],
    fallback: 'cart',
  });

  return (
    <Stack spacing={2} sx={{ py: 0.5 }} data-testid="cart-screen">
      <PageHeader testId="cart-header" title={t('mweb.cart.title')} />
      <DuncitTabs
        {...tabs}
        idPrefix="cart"
        variant="fullWidth"
        aria-label={t('mweb.cart.tabsLabel')}
        sx={SEGMENTED_TABS_SX}
      />
      <Box {...tabPanelProps('cart', tabs.value)}>
        {tabs.value === 'cart' ? <CartTab /> : <WishlistTab />}
      </Box>
    </Stack>
  );
}
