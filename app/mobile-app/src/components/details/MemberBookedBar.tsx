import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

export interface MemberBookedBarProps {
  canBackout: boolean;
  isExpired: boolean;
  /** Seats this member has already released and is still waiting to have
   * filled. A partial backout leaves them booked, so nothing else on this bar
   * would reveal that seats are out on sale. */
  releasedSeats: number;
  /** False once a replacement took them — the release is terminal then. */
  canTakeSeatsBack: boolean;
  restoringSpot: boolean;
  onBackout: () => void;
  onKeepSpot: () => void;
}

/**
 * Booked state: "Pod Booked" badge with an optional Backout action, plus the
 * seats a partial backout gave back.
 *
 * The note under the badge used to be a two-way choice, so a pod that had
 * simply already happened told the member they had used all their attempts —
 * and the badge kept saying "You're going" about an evening that was over.
 *
 * RN twin of mWeb's MemberPanel (rule 27).
 */
export function MemberBookedBar({
  canBackout,
  isExpired,
  releasedSeats,
  canTakeSeatsBack,
  restoringSpot,
  onBackout,
  onKeepSpot,
}: Readonly<MemberBookedBarProps>) {
  const { t } = useTranslation();
  let note: string | null = null;
  if (!canBackout) {
    note = isExpired ? t('mweb.podDetails.alreadyTakenPlace') : t('mweb.podDetails.backoutMaxed');
  }
  const overline = isExpired ? t('mweb.podDetails.youWent') : t('mweb.podDetails.youreGoing');
  const badge = isExpired ? t('mweb.podDetails.podVisited') : t('mweb.podDetails.podBooked');

  return (
    <YStack flex={1} gap={8}>
      <ReleasedSeatsRow
        releasedSeats={releasedSeats}
        canTakeSeatsBack={canTakeSeatsBack}
        restoringSpot={restoringSpot}
        onKeepSpot={onKeepSpot}
      />
      <XStack alignItems="center" gap={12}>
        <XStack flex={1} alignItems="center" gap={8}>
          <MaterialIcons name="check-circle" size={22} color={semantic.success} />
          <YStack flex={1}>
            <Text fontSize={11} color="$muted">
              {overline}
            </Text>
            <Text fontSize={16} fontWeight="700" color="$color" testID="pod-booked-label">
              {badge}
            </Text>
            {note ? (
              <Text fontSize={10.5} color="$muted" testID="pod-backout-maxed">
                {note}
              </Text>
            ) : null}
          </YStack>
        </XStack>
        {canBackout ? (
          <XStack
            testID="pod-backout"
            role="button"
            aria-label={t('mweb.podDetails.backoutFromPod')}
            onPress={onBackout}
            alignItems="center"
            justifyContent="center"
            paddingHorizontal={20}
            height={48}
            borderRadius={999}
            borderWidth={1}
            borderColor="$danger"
            pressStyle={{ opacity: 0.85 }}
          >
            <Text fontSize={14} fontWeight="700" color="$danger">
              {t('mweb.podDetails.backout')}
            </Text>
          </XStack>
        ) : null}
      </XStack>
    </YStack>
  );
}

/**
 * The seats a partial backout gave back, and the way to take them back.
 *
 * A partial release keeps the member booked, so it never reaches
 * BackoutInProcessBar — without this the released seats could only be
 * reclaimed by somebody else buying them.
 */
function ReleasedSeatsRow({
  releasedSeats,
  canTakeSeatsBack,
  restoringSpot,
  onKeepSpot,
}: Readonly<{
  releasedSeats: number;
  canTakeSeatsBack: boolean;
  restoringSpot: boolean;
  onKeepSpot: () => void;
}>) {
  const { t } = useTranslation();
  if (releasedSeats <= 0) return null;
  if (!canTakeSeatsBack) {
    return (
      <XStack alignItems="center" gap={8} testID="pod-released-seats-locked">
        <MaterialIcons name="lock-clock" size={18} color={semantic.warning} />
        <Text flex={1} fontSize={12} fontWeight="600" color="$muted">
          {t('mweb.podDetails.backoutLocked')}
        </Text>
      </XStack>
    );
  }
  const releasedKey =
    releasedSeats === 1 ? 'mweb.podDetails.releasedSeatsOne' : 'mweb.podDetails.releasedSeatsMany';
  return (
    <XStack alignItems="center" gap={8} testID="pod-released-seats">
      <MaterialIcons name="hourglass-top" size={18} color={semantic.warning} />
      <Text flex={1} fontSize={12} fontWeight="600" color="$muted">
        {t(releasedKey, { vars: { count: releasedSeats } })}
      </Text>
      <XStack
        testID="pod-take-seats-back"
        role="button"
        aria-label={t('mweb.podDetails.takeSeatsBack')}
        aria-disabled={restoringSpot}
        onPress={restoringSpot ? undefined : onKeepSpot}
        alignItems="center"
        justifyContent="center"
        paddingHorizontal={16}
        height={38}
        borderRadius={999}
        backgroundColor="$primary"
        opacity={restoringSpot ? 0.6 : 1}
        pressStyle={{ opacity: 0.85 }}
      >
        <TakeSeatsBackLabel />
      </XStack>
    </XStack>
  );
}

/** Hoisted so the themed label doesn't create a branch inside the row. */
function TakeSeatsBackLabel() {
  const { onPrimary } = useThemeColors();
  const { t } = useTranslation();
  return (
    <Text fontSize={13} fontWeight="700" color={onPrimary}>
      {t('mweb.podDetails.takeSeatsBack')}
    </Text>
  );
}
