import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Intrinsic height of the floating {@link BottomNav} bar, excluding the device
 * safe-area inset (icon bubble + label + the bar's own vertical padding).
 */
export const BOTTOM_NAV_BASE_HEIGHT = 74;

/**
 * Vertical space a scrollable tab screen must reserve at the bottom so its last
 * item clears the floating bottom navigation (bug 7). Uses the device's
 * safe-area inset instead of a hardcoded number, so it adapts to gesture bars /
 * notched devices on every platform.
 */
export function useBottomNavSpace(extra = 16): number {
  const insets = useSafeAreaInsets();
  return BOTTOM_NAV_BASE_HEIGHT + insets.bottom + extra;
}
