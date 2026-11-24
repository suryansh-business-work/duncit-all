import type { ReactNode } from 'react';
import { Text, YStack } from 'tamagui';

interface Props {
  title?: string;
  children: ReactNode;
  testID?: string;
}

/** A titled surface on the screen ground — the app's one card. */
export function Card({ title, children, testID }: Readonly<Props>) {
  return (
    <YStack backgroundColor="$surface" borderRadius="$4" borderWidth={1} borderColor="$borderColor" padding="$4" gap="$2" testID={testID}>
      {title ? (
        <Text fontWeight="700" fontSize="$5" role="heading">
          {title}
        </Text>
      ) : null}
      {children}
    </YStack>
  );
}
