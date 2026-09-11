import type { ReactNode } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { SectionHeader } from '@/components/SectionHeader';

interface Props {
  title: string;
  /** How many rows the section holds — a muted figure beside the title. */
  count?: number;
  /** Trailing controls, e.g. the Your-pods filter pill. */
  children?: ReactNode;
  testID?: string;
}

/**
 * A Host Studio section's title row: the calm SectionHeader, the row count and
 * any trailing control. Every list on the screen opens with this one strip, so
 * the sections cannot drift. mWeb twin: host-manage-page/HostSectionHeader.
 */
export function HostSectionHeader({ title, count, children, testID }: Readonly<Props>) {
  return (
    <XStack testID={testID} alignItems="center" gap={8}>
      <YStack flex={1}>
        <SectionHeader title={title} />
      </YStack>
      {count === undefined ? null : (
        <Text fontSize={14} fontWeight="600" color="$muted">
          {count}
        </Text>
      )}
      {children}
    </XStack>
  );
}
