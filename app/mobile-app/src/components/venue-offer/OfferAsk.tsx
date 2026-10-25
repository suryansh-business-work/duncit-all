import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface AskProps {
  /** What the venue provides for the money, one point each. */
  offerings: readonly string[];
  note: string;
  /** Whose terms these are — the note reads "from the host" or "from the venue". */
  by: string;
}

/**
 * What one side's terms ask beside the price: the points, each on its own row,
 * and their note. Nothing when there is neither. mWeb twin: OfferAsk.
 */
export function OfferAsk({ offerings, note, by }: Readonly<AskProps>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  // The same point twice reads once.
  const points = Array.from(new Set(offerings));
  if (points.length === 0 && !note) return null;
  const pointsLabel = t('availability.offers.offeringsLabel');

  return (
    <YStack gap={8} testID="offer-ask">
      {points.length > 0 ? (
        <YStack gap={4} aria-label={pointsLabel}>
          <Text fontSize={12} fontWeight="700" color="$muted">
            {pointsLabel}
          </Text>
          {points.map((point) => (
            <XStack key={point} gap={6} alignItems="flex-start">
              <MaterialIcons name="check" size={14} color={muted} aria-hidden />
              <Text flex={1} fontSize={13} color="$color">
                {point}
              </Text>
            </XStack>
          ))}
        </YStack>
      ) : null}
      {note ? (
        <YStack gap={2} testID="offer-ask-note">
          <Text fontSize={12} fontWeight="700" color="$muted">
            {by === 'VENUE'
              ? t('availability.offers.venueNote')
              : t('availability.offers.hostNote')}
          </Text>
          <Text fontSize={13} color="$color">
            {note}
          </Text>
        </YStack>
      ) : null}
    </YStack>
  );
}

/** "Answer by 5 Dec, 18:00" — until when the side whose move it is may answer. Nothing without a time. */
export function OfferAnswerBy({ at }: Readonly<{ at: string | null | undefined }>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const { formatDateTime } = useDateFormat();
  if (!at) return null;

  return (
    <XStack gap={6} alignItems="center" testID="offer-answer-by">
      <MaterialIcons name="schedule" size={16} color={muted} aria-hidden />
      <Text fontSize={12} fontWeight="700" color="$muted">
        {t('availability.offers.answerBy', { vars: { date: formatDateTime(at) } })}
      </Text>
    </XStack>
  );
}
