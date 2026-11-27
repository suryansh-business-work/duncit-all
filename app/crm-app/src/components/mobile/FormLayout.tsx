import { useCallback, useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';

import { MOBILE } from '@/constants/design';
import { ActionBar } from './ActionBar';

interface Props {
  children: ReactNode;
  /** The form's Save (and Cancel), pinned under the thumb above the keyboard. */
  footer?: ReactNode;
  testID?: string;
}

/**
 * A form screen: the fields scroll, the footer's buttons stay pinned at the
 * bottom, and both move up with the keyboard. The app draws edge to edge, so
 * the system no longer resizes the window for the keyboard; the avoiding view
 * does, offset by where it sits on the screen (measured, not guessed, so it
 * is right under any header height and status bar).
 */
export function FormLayout({ children, footer, testID }: Readonly<Props>) {
  const frame = useRef<View>(null);
  const [offset, setOffset] = useState(0);
  const measure = useCallback(() => {
    frame.current?.measureInWindow((_x, y) => setOffset(y));
  }, []);
  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={offset} style={{ flex: 1 }}>
      <View ref={frame} style={{ flex: 1 }} onLayout={measure} testID={testID}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: MOBILE.gutter, gap: 12 }}
        >
          {children}
        </ScrollView>
        {footer ? <ActionBar layout="buttons">{footer}</ActionBar> : null}
      </View>
    </KeyboardAvoidingView>
  );
}
