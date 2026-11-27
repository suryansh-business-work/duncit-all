import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Separator, Text, YStack } from 'tamagui';

import { RADII } from '@/constants/design';

interface Props {
  title?: string;
  /** A line under the group explaining it. */
  footer?: string;
  children: ReactNode;
  testID?: string;
}

/**
 * A titled group of list rows on one rounded surface with a hairline between
 * rows: the grouped list both platforms' settings and "More" screens use.
 */
export function ListSection({ title, footer, children, testID }: Readonly<Props>) {
  const rows = Children.toArray(children);
  return (
    <YStack gap="$1.5" testID={testID}>
      {title ? (
        <Text
          color="$muted"
          fontSize="$2"
          fontWeight="700"
          textTransform="uppercase"
          letterSpacing={0.6}
          paddingHorizontal="$3"
          role="heading"
        >
          {title}
        </Text>
      ) : null}
      <YStack
        backgroundColor="$surface"
        borderWidth={1}
        borderColor="$borderColor"
        borderRadius={RADII.lg}
        overflow="hidden"
      >
        {rows.map((row, i) => (
          <Fragment key={isValidElement(row) && row.key !== null ? row.key : i}>
            {i > 0 ? <Separator borderColor="$borderColor" marginLeft="$3" /> : null}
            {row}
          </Fragment>
        ))}
      </YStack>
      {footer ? (
        <Text color="$muted" fontSize="$2" paddingHorizontal="$3">
          {footer}
        </Text>
      ) : null}
    </YStack>
  );
}
