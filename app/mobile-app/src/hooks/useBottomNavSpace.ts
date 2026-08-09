import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Intrinsic height of the floating {@link BottomNav} bar, excluding the device
 * safe-area inset (icon bubble + label + the bar's own vertical padding).
 */
export const BOTTOM_NAV_BASE_HEIGHT = 74;

/**
 * The bottom system inset, in dp — on Android this IS the navigation bar, and
 * reading it is how the app "detects" which one the device uses: roughly 48 for
 * the 3-button bar, 16 for the gesture pill, and 0 when it is hidden or the
 * phone has none. It is measured per device at runtime, so nothing here needs a
 * height table.
 *
 * Every bottom-anchored element has to add this itself: since Expo SDK 54 the
 * app always draws edge-to-edge (`edgeToEdgeEnabled` cannot be turned off from
 * Android 16 / targetSdk 36), so the system bar is painted OVER the window
 * rather than shrinking it. Anything flush to `bottom: 0` without this sits
 * underneath the nav bar and gets clipped.
 */
export function useBottomInset(): number {
  return useSafeAreaInsets().bottom;
}

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
