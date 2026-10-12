import { Text, XStack, YStack } from 'tamagui';
import type { VenueBillLine } from '@duncit/utils';

interface Props {
  /** `buildVenueBillLines(...)` — every figure is the server's. */
  lines: readonly VenueBillLine[];
}

/**
 * The venue-bill summary in the completion dialog: attendees, the earlier slot
 * price, the final bill and the venue total they come to. Web twin:
 * `VenueBillSummary` in @duncit/ui.
 */
export function VenueBillSummary({ lines }: Readonly<Props>) {
  return (
    <YStack gap={4} testID="venue-bill-summary">
      {lines.map((line) => (
        <XStack
          key={line.key}
          gap={12}
          justifyContent="space-between"
          testID={`venue-bill-line-${line.key}`}
        >
          <Text flex={1} fontSize={13} fontWeight={line.strong ? '700' : '400'} color="$color">
            {line.label}
          </Text>
          <Text fontSize={13} fontWeight={line.strong ? '700' : '400'} color="$color">
            {line.value}
          </Text>
        </XStack>
      ))}
    </YStack>
  );
}
