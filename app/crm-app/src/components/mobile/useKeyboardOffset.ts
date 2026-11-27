import { useCallback, useRef, useState } from 'react';
import type { View } from 'react-native';

/**
 * Where a keyboard-avoiding view starts on the screen. The app draws edge to
 * edge, so the system no longer resizes the window for the keyboard; a
 * KeyboardAvoidingView does, and it needs its own top as the offset —
 * measured, not guessed, so it is right under any header and status bar.
 * Put `frameRef` and `onLayout` on the view inside the avoiding view.
 */
export function useKeyboardOffset() {
  const frameRef = useRef<View>(null);
  const [offset, setOffset] = useState(0);
  const onLayout = useCallback(() => {
    frameRef.current?.measureInWindow((_x, y) => setOffset(y));
  }, []);
  return { frameRef, offset, onLayout };
}
