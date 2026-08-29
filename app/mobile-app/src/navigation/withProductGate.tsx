import type { ComponentType } from 'react';
import { useEffect } from 'react';

import { useProductVisibility } from '@/hooks/useProductVisibility';
import { navigationRef } from '@/navigation/navigationRef';

/**
 * Keeps a product screen behind the `is_product_visible` system flag — the RN
 * twin of mWeb's `RequireProducts` route wrapper (rule 27).
 *
 * With the feature off these are not missing screens, they are screens the app
 * currently has no feature for, so a deep link that reaches one goes Home
 * instead of showing an empty shop. It waits on `pending` first: the flag set
 * lands a beat after launch, and acting on that beat would bounce every
 * product deep link even with the feature switched on.
 *
 * Applied at MODULE scope in the navigator — a wrapper built during render
 * would be a new component type on every render (S6478) and remount the screen.
 */
export function withProductGate<P extends object>(Screen: ComponentType<P>): ComponentType<P> {
  function ProductGatedScreen(props: P) {
    const { pending, visible } = useProductVisibility();

    useEffect(() => {
      if (pending || visible || !navigationRef.isReady()) return;
      navigationRef.navigate('Home');
    }, [pending, visible]);

    if (!visible) return null;
    return <Screen {...props} />;
  }
  ProductGatedScreen.displayName = `withProductGate(${Screen.displayName ?? Screen.name})`;
  return ProductGatedScreen;
}
