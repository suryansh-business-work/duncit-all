import type { ReactNode } from 'react';
import { KeyboardAvoidingView } from 'react-native';

/**
 * Global keyboard avoidance — wraps every screen scaffold (StackScreen,
 * TabScreen) and input-bearing modals so focused TextInputs always stay visible
 * above the keyboard.
 *
 * `behavior="padding"` shrinks the content area by the keyboard height on BOTH
 * platforms: on iOS that's the standard approach, and on Android SDK 54+
 * edge-to-edge is always enabled, which makes the old window-resize path
 * (`softwareKeyboardLayoutMode: "resize"`) a no-op — so the avoiding view must
 * apply the inset itself or bottom-anchored inputs hide behind the keyboard.
 */
export function KeyboardScreen({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      {children}
    </KeyboardAvoidingView>
  );
}
