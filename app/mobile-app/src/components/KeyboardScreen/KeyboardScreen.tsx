import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

/**
 * Global keyboard avoidance — wraps every screen scaffold (StackScreen,
 * TabScreen) and input-bearing modals so focused TextInputs always stay visible
 * above the keyboard:
 *
 * - iOS: `behavior="padding"` shrinks the content area by the keyboard height,
 *   so bottom-anchored inputs (chat composers, forms) slide up smoothly.
 * - Android: the window itself resizes (`softwareKeyboardLayoutMode: "resize"`
 *   in app.json) — adding KeyboardAvoidingView on top of that double-shifts the
 *   layout and causes jumps, so the native resize is left to do the work.
 *
 * New screens get this automatically by using the shared scaffolds; ScrollViews
 * inside keep their own scroll position, so long forms remain reachable.
 */
export function KeyboardScreen({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
