import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';
import { cartBadgeLabel } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { TAB_CONFIG } from '@/navigation/tabs';
import { selectCartCount, useCartStore } from '@/stores/cart.store';
import { PRESS_STYLE } from '@duncit/buttons-native';

/**
 * How much is in the basket, on the Cart tab's icon. The other four pass 0 and
 * draw nothing, so one component covers the whole bar — the count is the only
 * thing the header entry point carried that the bar had to inherit.
 */
function TabBadge({ count }: Readonly<{ count: number }>) {
  if (count <= 0) return null;
  return (
    <YStack
      testID="tab-bar-cart-count"
      position="absolute"
      top={2}
      right={4}
      minWidth={16}
      height={16}
      paddingHorizontal={3}
      alignItems="center"
      justifyContent="center"
      borderRadius={999}
      backgroundColor="$danger"
    >
      <Text fontSize={9} fontWeight="700" color="#ffffff">
        {cartBadgeLabel(count)}
      </Text>
    </YStack>
  );
}

/**
 * Edge-to-edge flat tab bar — full width, no border radius, with the active tab
 * tinted in the primary colour (icon scales in smoothly). Identical to mWeb's
 * BottomNav. Used as React Navigation's custom `tabBar`.
 *
 * It draws whatever the navigator registered, and every tab is `flex: 1` — so
 * with products switched off, where `MainTabs` never registers the Cart, the
 * remaining four spread across the whole bar instead of leaving a gap.
 */
export function BottomNav({ state, navigation }: Readonly<BottomTabBarProps>) {
  const insets = useSafeAreaInsets();
  const { muted, primary } = useThemeColors();
  const { t } = useTranslation();
  const cartCount = useCartStore(selectCartCount);

  return (
    <XStack
      position="absolute"
      left={0}
      right={0}
      bottom={0}
      backgroundColor="$surface"
      borderTopWidth={1}
      borderColor="$borderColor"
      paddingTop={6}
      paddingBottom={insets.bottom + 6}
      justifyContent="space-between"
      shadowColor="#000000"
      shadowOpacity={0.14}
      shadowRadius={18}
      shadowOffset={{ width: 0, height: -6 }}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const cfg = TAB_CONFIG.find((t) => t.name === route.name);
        if (!cfg) return null;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <YStack
            key={route.key}
            testID={`tab-bar-${cfg.name}`}
            role="button"
            aria-label={cfg.label}
            aria-pressed={focused}
            onPress={onPress}
            flex={1}
            alignItems="center"
            gap={2}
            paddingVertical={4}
            pressStyle={PRESS_STYLE.control}
          >
            {/* Active tab = primary tint only, no background shape (user ask). */}
            <YStack width={44} height={30} alignItems="center" justifyContent="center">
              <MaterialIcons name={cfg.icon} size={21} color={focused ? primary : muted} />
              <TabBadge count={cfg.name === 'Cart' ? cartCount : 0} />
            </YStack>
            <Text fontSize={11} fontWeight="600" color={focused ? '$primary' : '$muted'}>
              {t(cfg.labelKey)}
            </Text>
          </YStack>
        );
      })}
    </XStack>
  );
}
