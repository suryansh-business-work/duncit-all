import { Text, XStack, YStack } from 'tamagui';

import { SeatPicker } from '@/components/details/SeatPicker';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

export interface PodBookBarProps {
  isFree: boolean;
  isFull: boolean;
  podAmount: number;
  seats: number;
  maxSeats: number;
  onSeatsChange: (seats: number) => void;
  onCheckout: () => void;
}

/** Not-yet-booked state: price + seat picker + a Join/Book button (disabled when
 * the pod is full). The price shown is the ticket × seats. */
export function PodBookBar({
  isFree,
  isFull,
  podAmount,
  seats,
  maxSeats,
  onSeatsChange,
  onCheckout,
}: Readonly<PodBookBarProps>) {
  const { onPrimary } = useThemeColors();
  const { t } = useTranslation();
  const freeOrBookAria = isFree ? t('mweb.podDetails.joinPod') : t('mweb.podDetails.bookPod');
  const bookAriaLabel = isFull ? t('mweb.podDetails.podIsFull') : freeOrBookAria;
  const freeOrBookText = isFree ? t('mweb.podDetails.join') : t('mweb.podDetails.bookNow');
  const bookText = isFull ? t('mweb.podDetails.podIsFull') : freeOrBookText;
  const priceCaption = isFree ? t('mweb.podDetails.entry') : t('mweb.podDetails.price');
  const priceValue = isFree ? t('mweb.podDetails.free') : `₹${podAmount * seats}`;
  return (
    <>
      <YStack flex={1}>
        <Text fontSize={11} color="$muted">
          {priceCaption}
        </Text>
        <Text fontSize={18} fontWeight="700" color="$color">
          {priceValue}
        </Text>
      </YStack>
      <SeatPicker value={seats} onChange={onSeatsChange} maxSeats={maxSeats} disabled={isFull} />
      <XStack
        testID="pod-book"
        role="button"
        aria-label={bookAriaLabel}
        aria-disabled={isFull}
        onPress={isFull ? undefined : onCheckout}
        alignItems="center"
        justifyContent="center"
        paddingHorizontal={28}
        height={48}
        borderRadius={999}
        backgroundColor={isFull ? '$muted' : '$primary'}
        opacity={isFull ? 0.6 : 1}
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={15} fontWeight="700" color={onPrimary}>
          {bookText}
        </Text>
      </XStack>
    </>
  );
}
