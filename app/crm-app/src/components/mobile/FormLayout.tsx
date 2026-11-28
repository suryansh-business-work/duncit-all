import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';

import { MOBILE } from '@/constants/design';
import { ActionBar } from './ActionBar';
import { useKeyboardOffset } from './useKeyboardOffset';

interface Props {
  children: ReactNode;
  /** The form's Save (and Cancel), pinned under the thumb above the keyboard. */
  footer?: ReactNode;
  testID?: string;
}

/**
 * A form screen: the fields scroll, the footer's buttons stay pinned at the
 * bottom, and both move up with the keyboard (useKeyboardOffset).
 */
export function FormLayout({ children, footer, testID }: Readonly<Props>) {
  const { frameRef, offset, onLayout } = useKeyboardOffset();
  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={offset} style={{ flex: 1 }}>
      <View ref={frameRef} style={{ flex: 1 }} onLayout={onLayout} testID={testID}>
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
