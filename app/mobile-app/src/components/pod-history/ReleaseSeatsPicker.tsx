import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** Seats the booking holds. */
  held: number;
  value: number;
  onChange: (seats: number) => void;
  disabled?: boolean;
}

/**
 * How many seats a backout gives back — the Tamagui twin of the "Seats to
 * release" field in mWeb's BackoutConfirmDialog (rule 27).
 *
 * Hidden for a single-seat booking, where backing out has only ever meant all
 * of it and a stepper offering "1 of 1" is furniture.
 */
export function ReleaseSeatsPicker({ held, value, onChange, disabled }: Readonly<Props>) {
  const { color: ink } = useThemeColors();
  const { t } = useTranslation();
  if (held <= 1) return null;
  const seats = Math.min(Math.max(value, 1), held);
  const kept = held - seats;
  const keptKey = kept === 1 ? 'mweb.podDetails.keepSeatsOne' : 'mweb.podDetails.keepSeatsMany';
  const partialHint = t(keptKey, { vars: { count: kept } });
  const step = (next: number) => {
    if (disabled) return;
    onChange(Math.min(Math.max(next, 1), held));
  };

  return (
    <YStack gap={6} testID="backout-seat-picker">
      <Text fontSize={13} fontWeight="600" color="$color">
        {t('mweb.podDetails.seatsToRelease')}
      </Text>
      <XStack alignItems="center" gap={12}>
        <XStack
          alignItems="center"
          height={44}
          borderRadius={999}
          borderWidth={1}
          borderColor="$borderColor"
          opacity={disabled ? 0.6 : 1}
        >
          <XStack
            testID="backout-seat-minus"
            role="button"
            aria-label={t('mweb.podDetails.oneSeatFewer')}
            aria-disabled={seats <= 1}
            onPress={() => step(seats - 1)}
            width={38}
            height={44}
            alignItems="center"
            justifyContent="center"
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="remove" size={18} color={ink} />
          </XStack>
          <Text
            testID="backout-seat-count"
            fontSize={15}
            fontWeight="700"
            color="$color"
            minWidth={40}
            textAlign="center"
          >
            {seats} / {held}
          </Text>
          <XStack
            testID="backout-seat-plus"
            role="button"
            aria-label={t('mweb.podDetails.oneSeatMore')}
            aria-disabled={seats >= held}
            onPress={() => step(seats + 1)}
            width={38}
            height={44}
            alignItems="center"
            justifyContent="center"
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="add" size={18} color={ink} />
          </XStack>
        </XStack>
      </XStack>
      <Text fontSize={12} color="$muted">
        {kept > 0 ? partialHint : t('mweb.podDetails.releasingAll')}
      </Text>
    </YStack>
  );
}
