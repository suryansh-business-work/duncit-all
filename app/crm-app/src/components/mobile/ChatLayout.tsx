import { useRef, type ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { YStack } from 'tamagui';

import { MOBILE } from '@/constants/design';
import { useKeyboardOffset } from './useKeyboardOffset';

interface Props {
  children: ReactNode;
  /** The message box and Send: pinned at the bottom, it rides up with the keyboard. */
  composer: ReactNode;
  testID?: string;
}

/**
 * A chat screen as phones draw one: only the conversation scrolls, and it
 * follows the newest message; the composer stays fixed at the bottom on its
 * own surface and moves up with the keyboard (useKeyboardOffset).
 */
export function ChatLayout({ children, composer, testID }: Readonly<Props>) {
  const { frameRef, offset, onLayout } = useKeyboardOffset();
  const scroll = useRef<ScrollView>(null);
  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={offset} style={{ flex: 1 }}>
      <View ref={frameRef} style={{ flex: 1 }} onLayout={onLayout} testID={testID}>
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: MOBILE.gutter, gap: 12 }}
          // A new message or answer grows the content: keep the latest in view.
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          testID={testID ? `${testID}-messages` : undefined}
        >
          {children}
        </ScrollView>
        <YStack
          backgroundColor="$surface"
          borderTopWidth={1}
          borderColor="$borderColor"
          paddingHorizontal="$3"
          paddingVertical="$2"
        >
          {composer}
        </YStack>
      </View>
    </KeyboardAvoidingView>
  );
}
