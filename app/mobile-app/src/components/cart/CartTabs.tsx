import { Text, XStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

export type CartTab = 'cart' | 'wishlist';

const TABS: { key: CartTab; labelKey: string }[] = [
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
    <XStack
      gap={8}
      marginHorizontal={16}
      marginTop={12}
      padding={4}
      borderRadius={999}
      backgroundColor="$soft"
      role="tablist"
      aria-label={t('mweb.cart.tabsLabel')}
    >
      {TABS.map((tab) => {
        const selected = value === tab.key;
        return (
          <XStack
            key={tab.key}
            testID={`cart-tab-${tab.key}`}
            role="tab"
            aria-selected={selected}
            tabIndex={0}
            onPress={() => onChange(tab.key)}
            flex={1}
            height={40}
            alignItems="center"
            justifyContent="center"
            borderRadius={999}
            backgroundColor={selected ? '$primary' : 'transparent'}
            pressStyle={PRESS_STYLE.control}
          >
            <Text fontSize={13.5} fontWeight="600" color={selected ? '$onPrimary' : '$muted'}>
              {t(tab.labelKey)}
            </Text>
          </XStack>
        );
      })}
    </XStack>
  );
}
