import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useKeyboardInset } from '@/hooks/useKeyboardInset';

/**
 * Global keyboard avoidance — wraps every screen scaffold (StackScreen,
 * TabScreen) and input-bearing modals so focused TextInputs always stay visible
 * above the keyboard.
 *
 * This shrinks the content area by {@link useKeyboardInset} rather than using
 * RN's `KeyboardAvoidingView`: under the edge-to-edge window that Expo SDK 54
 * forces on Android, that component measures against a window which no longer
 * resizes and puts the input behind the keyboard. Padding a plain view with a
 * frame-derived height behaves identically on both platforms. On Android the
 * shrink also re-reveals a focused input inside a ScrollView, because the
 * native ScrollView scrolls its focused child back on screen when it resizes.
 *
 * Never nest one inside another (a screen inside `StackScreen` is already
 * wrapped) — each adds the full lift, so a nested pair floats the content a
 * whole keyboard above the keyboard.
 *
 * Pass `flush` when this view reaches the screen's bottom edge with nothing
 * reserving the bottom safe-area under it — see {@link useKeyboardInset}.
 */
export function KeyboardScreen({
  children,
  flush = false,
}: Readonly<{ children: ReactNode; flush?: boolean }>) {
  const keyboardInset = useKeyboardInset(flush);
  return <View style={{ flex: 1, paddingBottom: keyboardInset }}>{children}</View>;
}
