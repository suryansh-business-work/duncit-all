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
 * frame-derived height behaves identically on both platforms.
 */
export function KeyboardScreen({ children }: Readonly<{ children: ReactNode }>) {
  const keyboardInset = useKeyboardInset();
  return <View style={{ flex: 1, paddingBottom: keyboardInset }}>{children}</View>;
}
