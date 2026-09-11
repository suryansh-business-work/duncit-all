import { Text, XStack, YStack } from 'tamagui';

import type { MyReferral } from '@/hooks/useReferral';
import { formatRelative } from '@/utils/date-format';

type ReferredEntry = MyReferral['referred'][number];

/** One friend I brought in — a row inside the friends card. */
export function ReferredRow({
  entry,
  fallbackName,
}: Readonly<{ entry: ReferredEntry; fallbackName: string }>) {
  const name = entry.full_name || fallbackName;
  return (
    <XStack
      testID={`referral-row-${entry.user_id}`}
      alignItems="center"
      gap={12}
      paddingHorizontal={16}
      paddingVertical={12}
    >
      <YStack
        width={40}
        height={40}
        borderRadius={20}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$soft"
      >
        <Text fontSize={16} fontWeight="600" color="$color">
          {name.charAt(0).toUpperCase()}
        </Text>
      </YStack>
      <Text flex={1} fontSize={14} fontWeight="500" color="$color" numberOfLines={1}>
        {name}
      </Text>
      <Text fontSize={12} color="$muted">
        {formatRelative(entry.referred_at)} ago
      </Text>
    </XStack>
  );
}
