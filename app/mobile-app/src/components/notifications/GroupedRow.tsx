import type { ReactNode } from 'react';
import { YStack } from 'tamagui';

interface Props {
  index: number;
  count: number;
  children: ReactNode;
}

/** One slot of a grouped list card: the rows of a virtualised list render
 * separately, so each draws its own slice of the one 24px card — rounded at
 * the ends, a hairline between rows. mWeb twin: the Paper around the rows. */
export function GroupedRow({ index, count, children }: Readonly<Props>) {
  const first = index === 0;
  const last = index === count - 1;
  return (
    <YStack
      backgroundColor="$surface"
      borderColor="$cardBorder"
      borderLeftWidth={1}
      borderRightWidth={1}
      borderTopWidth={first ? 1 : 0}
      borderBottomWidth={last ? 1 : 0}
      borderTopLeftRadius={first ? 24 : 0}
      borderTopRightRadius={first ? 24 : 0}
      borderBottomLeftRadius={last ? 24 : 0}
      borderBottomRightRadius={last ? 24 : 0}
      overflow="hidden"
    >
      {first ? null : <YStack height={1} backgroundColor="$borderColor" />}
      {children}
    </YStack>
  );
}
