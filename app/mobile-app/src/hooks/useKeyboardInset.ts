import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { keyboardLift } from '@duncit/dialogs-native';

import { useBottomInset } from '@/hooks/useBottomNavSpace';

/**
 * The lift itself now lives in `@duncit/dialogs-native`, where it is covered
 * directly rather than only through this hook. Re-exported so the existing call
 * sites and tests keep their import path.
 */
export { keyboardLift };

/**
 * How far bottom-anchored content must lift so the on-screen keyboard does not
 * cover it — `0` whenever the keyboard is closed.
 *
 * Why this exists instead of `KeyboardAvoidingView`: since Expo SDK 54 Android
 * always runs edge-to-edge, which makes `softwareKeyboardLayoutMode: "resize"`
 * a no-op — the window keeps its full height and the keyboard is drawn over it,
 * so a bottom-anchored input has to move itself. RN's `KeyboardAvoidingView`
 * measures against the un-resized window there and lands the input either
 * behind the keyboard or a nav-bar's worth too high.
 *
 * The two platforms report the keyboard differently. iOS's frame runs to the
 * very bottom of the screen, so it already spans the home-indicator strip.
 * Android's does NOT: React Native reports `ime - systemBars` (ReactRootView
 * `checkForKeyboardEvents`), i.e. the keyboard WITHOUT the navigation bar under
 * it. The bar is added back here so {@link keyboardLift} always receives the
 * distance from the screen's bottom edge — skipping that is what left every
 * Android input a nav bar's height (48dp on the 3-button bar) behind the
 * keyboard.
 *
 * @param flush `true` when the lifted view reaches the screen's bottom edge
 *   with no bottom safe-area under it (a tab screen, a centred modal card, a
 *   full-screen scrim). By default the caller sits inside a `SafeAreaView` (or
 *   equivalent padding) that already reserved the bottom inset, and that strip
 *   is subtracted so it is not counted twice.
 */
export function useKeyboardInset(flush = false): number {
  const bottomInset = useBottomInset();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // iOS emits `will*` ahead of the animation, so the content moves in step
    // with the keyboard instead of snapping after it. Android only fires `did*`.
    const isIOS = Platform.OS === 'ios';
    const showSub = Keyboard.addListener(isIOS ? 'keyboardWillShow' : 'keyboardDidShow', (event) =>
      setKeyboardHeight(event.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(isIOS ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setKeyboardHeight(0),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const addsNavBar = keyboardHeight > 0 && Platform.OS === 'android';
  const frame = addsNavBar ? keyboardHeight + bottomInset : keyboardHeight;
  return keyboardLift(frame, flush ? 0 : bottomInset);
}
