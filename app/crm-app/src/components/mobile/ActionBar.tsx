import type { ReactNode } from 'react';
import { XStack } from 'tamagui';

interface Props {
  children: ReactNode;
  /** Columns of quick actions share the width evenly; buttons sit at the end. */
  layout?: 'actions' | 'buttons';
  testID?: string;
}

/**
 * The bar pinned to the bottom of a screen, under the thumb: a lead's quick
 * actions, or a form's Cancel / Save. It sits above the system navigation bar
 * (the stack screen layout already pads for it) on the surface colour with a
 * hairline on top.
 */
export function ActionBar({ children, layout = 'actions', testID }: Readonly<Props>) {
  return (
    <XStack
      backgroundColor="$surface"
      borderTopWidth={1}
      borderColor="$borderColor"
      paddingHorizontal="$2"
      paddingVertical="$1.5"
      gap="$2"
      alignItems="center"
      justifyContent={layout === 'buttons' ? 'flex-end' : 'space-around'}
      testID={testID}
    >
      {children}
    </XStack>
  );
}
