import { PillTabs, type PillTab } from '@/components/PillTabs';
import { useTranslation } from '@/hooks/useTranslation';

export type CartTab = 'cart' | 'wishlist';

const TABS: readonly PillTab<CartTab>[] = [
  { key: 'cart', labelKey: 'mweb.cart.tabCart' },
  { key: 'wishlist', labelKey: 'mweb.cart.tabWishlist' },
];

/**
 * Cart | Wishlist — the pill strip over the cart screen. Twin of mWeb's
 * DuncitTabs strip on CartPage (rule 27); native has no URL to hold the
 * selection, so the screen keeps it in state.
 */
export function CartTabs({
  value,
  onChange,
}: Readonly<{ value: CartTab; onChange: (tab: CartTab) => void }>) {
  const { t } = useTranslation();
  return (
    <PillTabs
      tabs={TABS}
      value={value}
      onChange={onChange}
      ariaLabel={t('mweb.cart.tabsLabel')}
      testIDPrefix="cart-tab"
    />
  );
}
