import type { ReactNode } from 'react';
import { Text, YStack } from 'tamagui';

/**
 * A labelled circular header action (mock): the existing button with a tiny
 * caption beneath it. Tamagui twin of mWeb's HeaderQuickActions QuickAction.
 */
export function QuickAction({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <YStack alignItems="center" gap={1}>
      {children}
      <Text fontSize={10} fontWeight="600" color="$muted" lineHeight={11}>
        {label}
      </Text>
    </YStack>
  );
}
