import { useEffect } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  value: number;
  onChange: (seats: number) => void;
  /** Seats still bookable, from `podMembershipState.max_seats_per_booking`. */
  maxSeats: number;
  disabled?: boolean;
}

/**
 * How many seats this booking takes, shown beside the Book/Join button — the
 * Tamagui twin of mWeb's SeatPicker (rule 27). A stepper rather than a menu:
 * the ceiling is whatever the pod has free, a booking may take every remaining
 * seat, and a virtual pod can be sized in the thousands — so nothing here
 * enumerates the seats below the ceiling.
 *
 * Hidden when only one seat is left: a picker with a single option is furniture.
 */
export function SeatPicker({ value, onChange, maxSeats, disabled }: Readonly<Props>) {
  const { color: ink, muted } = useThemeColors();
  const { t } = useTranslation();
  const top = Math.max(0, Math.floor(maxSeats) || 0);
  const seats = Math.min(Math.max(value, 1), Math.max(top, 1));
  // Clamping only what is DISPLAYED left the parent holding the larger number,
  // so a stepper showing 3 could submit 5 and the pod would reject the booking
  // after the buyer had filled in the whole checkout form. Tell the parent.
  useEffect(() => {
    if (seats !== value) onChange(seats);
  }, [seats, value, onChange]);
  if (top <= 1) return null;

  const step = (next: number) => {
    if (disabled) return;
    onChange(Math.min(Math.max(next, 1), top));
  };

  return (
    <XStack
      testID="pod-seat-picker"
      role="group"
      aria-label={t('mweb.podDetails.numberOfSeats')}
      alignItems="center"
      height={48}
      borderRadius={999}
      borderWidth={1}
      borderColor="$borderColor"
      opacity={disabled ? 0.6 : 1}
    >
      <XStack
        testID="pod-seat-minus"
        role="button"
        aria-label={t('mweb.podDetails.oneSeatFewer')}
        aria-disabled={seats <= 1}
        onPress={() => step(seats - 1)}
        width={38}
        height={48}
        alignItems="center"
        justifyContent="center"
        pressStyle={PRESS_STYLE.row}
      >
        <MaterialIcons name="remove" size={18} color={seats <= 1 ? muted : ink} />
      </XStack>
      <Text
        testID="pod-seat-count"
        fontSize={15}
        fontWeight="700"
        color="$color"
        minWidth={18}
        textAlign="center"
      >
        {seats}
      </Text>
      <XStack
        testID="pod-seat-plus"
        role="button"
        aria-label={t('mweb.podDetails.oneSeatMore')}
        aria-disabled={seats >= top}
        onPress={() => step(seats + 1)}
        width={38}
        height={48}
        alignItems="center"
        justifyContent="center"
        pressStyle={PRESS_STYLE.row}
      >
        <MaterialIcons name="add" size={18} color={seats >= top ? muted : ink} />
      </XStack>
    </XStack>
  );
}
