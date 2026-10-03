import {
  useNavigation,
  useNavigationState,
  type NavigationState,
  type PartialState,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { CartReminderNudge } from '@/components/cart/CartReminderNudge';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useCartNudge } from '@/hooks/useCartNudge';
import { useCartServerSync } from '@/hooks/useCartServerSync';
import { useProductVisibility } from '@/hooks/useProductVisibility';
import type { RootStackParamList } from '@/navigation/types';

type AnyState = NavigationState | PartialState<NavigationState>;

/** The screen actually on top — walks nested navigators (stack → tabs). */
function focusedRouteName(state: AnyState | undefined): string {
  let current = state;
  let name = '';
  while (current?.routes?.length) {
    const route = current.routes[current.index ?? current.routes.length - 1];
    if (!route) break;
    name = route.name;
    current = route.state;
  }
  return name;
}

function CartReminderContent() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useNavigationState((state) => focusedRouteName(state));
  useCartServerSync();
  const nudge = useCartNudge(route);
  if (!nudge.open) return null;
  return (
    <CartReminderNudge
      lines={nudge.lines}
      totalCount={nudge.totalCount}
      hideMs={nudge.hideMs}
      onCheckout={() => {
        nudge.hide();
        navigation.navigate('Home', { screen: 'Cart' });
      }}
      onHide={nudge.hide}
      onLater={nudge.later}
      onMute={nudge.mute}
    />
  );
}

/**
 * The signed-in cart's background companions on the tab screens: the server
 * mirror the reminder email reads, and the "your cart is calling" nudge.
 * Nothing runs with products switched off. Its own boundary — a fault here
 * must never take the tabs down. Twin of mWeb's CartReminderHost.
 */
export function CartReminder() {
  const { visible } = useProductVisibility();
  if (!visible) return null;
  return (
    <ErrorBoundary>
      <CartReminderContent />
    </ErrorBoundary>
  );
}
