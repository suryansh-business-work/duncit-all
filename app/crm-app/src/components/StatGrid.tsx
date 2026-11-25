import { Text, XStack, YStack } from 'tamagui';

import { RADII } from '@/constants/design';

export interface StatItem {
  key: string;
  label: string;
  value: number | string;
}

/** Labelled numbers, two to a row — the portal's StatGrid (each value read out with its name). */
export function StatGrid({ items }: Readonly<{ items: readonly StatItem[] }>) {
  return (
    <XStack flexWrap="wrap" gap="$2">
      {items.map((item) => (
        <YStack
          key={item.key}
          flexBasis="46%"
          flexGrow={1}
          padding="$2.5"
          borderRadius={RADII.sm}
          backgroundColor="$soft"
          accessible
          aria-label={`${item.label}: ${item.value}`}
          testID={`stat-${item.key}`}
        >
          <Text color="$muted" fontSize="$2">
            {item.label}
          </Text>
          <Text fontSize="$6" fontWeight="700">
            {item.value}
          </Text>
        </YStack>
      ))}
    </XStack>
  );
}
