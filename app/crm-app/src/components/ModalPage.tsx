import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

interface Props {
  children: ReactNode;
  /** What a screen reader announces for the page. */
  label?: string;
  testID?: string;
}

/**
 * The page inside a full-screen `Modal`. Android draws a modal edge to edge
 * (and iOS covers the status bar), so the page keeps its title clear of the
 * status bar and its last row clear of the system navigation bar.
 */
export function ModalPage({ children, label, testID }: Readonly<Props>) {
  const { top, bottom } = useSafeAreaInsets();
  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      paddingTop={top}
      paddingBottom={bottom}
      aria-label={label}
      testID={testID}
    >
      {children}
    </YStack>
  );
}
