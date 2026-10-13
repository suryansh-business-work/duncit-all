import { Text, XStack } from 'tamagui';
import type { CartControlLabels, CartControlNotice } from '@duncit/utils';

interface Props {
  /** From `useCartControlNotice` — null while there is nothing to say. */
  notice: CartControlNotice | null;
  labels: Pick<CartControlLabels, 'added' | 'removed'>;
  testID: string;
  /** Where the chip sits against its parent's top edge; negative lifts it above. */
  top?: number;
}

/**
 * "Item added" / "Item removed", as a small dark chip across the top of the
 * card's image. The strip it sits in is always there and is the live region, so
 * the words are announced when they arrive; it never takes a touch, so the
 * image under it stays tappable.
 */
export function CartNoticeChip({ notice, labels, testID, top = 8 }: Readonly<Props>) {
  return (
    <XStack
      position="absolute"
      top={top}
      left={4}
      right={4}
      justifyContent="center"
      pointerEvents="none"
      aria-live="polite"
    >
      {notice ? (
        <XStack
          testID={testID}
          paddingHorizontal={10}
          paddingVertical={4}
          borderRadius={999}
          backgroundColor="$color"
        >
          <Text fontSize={11} fontWeight="600" color="$background" numberOfLines={1}>
            {labels[notice]}
          </Text>
        </XStack>
      ) : null}
    </XStack>
  );
}
