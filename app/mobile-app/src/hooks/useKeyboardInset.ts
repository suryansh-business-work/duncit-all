import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { keyboardLift } from '@duncit/dialogs-native';

import { useBottomInset } from '@/hooks/useBottomNavSpace';

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
 * The reported keyboard frame is measured from the very bottom of the screen,
 * so it already spans the navigation-bar strip that a safe-area inset also
 * covers. Subtracting {@link useBottomInset} keeps that strip from being
 * counted twice (which is what leaves a visible gap under the keyboard), and
 * `Math.max` keeps the result sane on a device whose inset exceeds a small
 * floating keyboard.
 */
/**
 * The lift itself now lives in `@duncit/dialogs-native`, where it is covered
 * directly rather than only through this hook. Re-exported so the existing call
 * sites and tests keep their import path.
 */
export { keyboardLift };

export function useKeyboardInset(): number {
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

  return keyboardLift(keyboardHeight, bottomInset);
}
