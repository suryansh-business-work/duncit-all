import type { LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';
import { podPhase } from '@duncit/utils';

import { BackoutInProcessBar } from '@/components/details/BackoutInProcessBar';
import { MemberBookedBar } from '@/components/details/MemberBookedBar';
import { PodBookBar } from '@/components/details/PodBookBar';
import { TourAnchor } from '@/tours/TourAnchor';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { PodDetail, PodMembershipState } from '@/hooks/useDetails';

interface Props {
  pod: PodDetail;
  isFree: boolean;
  isHost: boolean;
  membershipState: PodMembershipState | null;
  /** Seats this booking will take (1 by default). */
  seats: number;
  onSeatsChange: (seats: number) => void;
  onCheckout: () => void;
  onBackout: () => void;
  onKeepSpot: () => void;
  onGoToDashboard: () => void;
  /** True while "Keep My Spot" / "Take Seats Back" is in flight. */
  restoringSpot?: boolean;
  /** Reports the bar's rendered height so the scroll behind it can reserve
   * exactly that much room — the bar's height changes with its state. */
  onLayout?: (event: LayoutChangeEvent) => void;
}

/**
 * Sticky bottom booking bar. Reflects the viewer's membership so a pod that is
 * already booked shows "Pod Booked" (+ Backout) instead of offering to pay again
 * — matching mWeb's PodActionPanel. A booking in "Backout in process" offers
 * "Keep My Spot" until the released seat is rebooked; a PARTIAL backout keeps
 * the member booked, so its released seats are taken back from the booked bar
 * instead. Full pods show a disabled "Pod is full". The pod's own host never
 * books their pod — they get a "Go to Dashboard" CTA into Host Studio instead.
 */
export function PodBookingBar({
  pod,
  isFree,
  isHost,
  membershipState,
  seats,
  onSeatsChange,
  onCheckout,
  onBackout,
  onKeepSpot,
  onGoToDashboard,
  restoringSpot = false,
  onLayout,
}: Readonly<Props>) {
  const isMember = !!membershipState?.is_member;
  const inProcess = !!membershipState?.backout_in_process;
  const canBackout = !!membershipState?.can_backout;
  const canCancelBackout = !!membershipState?.can_cancel_backout;
  const releasedSeats = Number(membershipState?.released_seats_pending ?? 0);
  const isFull = !isMember && !inProcess && membershipState?.can_join === false;
  // Once the pod has STARTED, booking is closed for non-members — the server
  // enforces the same rule on joinFree + payment order creation, so we replace
  // the CTA with a notice (mirrors mWeb's PodActionPanel). A pod that is still
  // running says so rather than claiming it has already taken place.
  const phase = podPhase(pod.pod_date_time, pod.pod_end_date_time);
  const isExpired = phase !== 'UPCOMING';
  const showClosedNotice = !isHost && isExpired && !isMember && !inProcess;
  const showBookBar = !isHost && !showClosedNotice && !isMember && !inProcess;

  return (
    <YStack
      position="absolute"
      left={0}
      right={0}
      bottom={0}
      onLayout={onLayout}
      backgroundColor="$background"
      borderTopWidth={1}
      borderColor="$borderColor"
    >
      <SafeAreaView edges={['bottom']}>
        {/* The whole bar, not just the Book button: which control sits here
            depends on whether the viewer is the host, already in, backing out or
            still deciding, and the tour describes the bar's job either way. */}
        <TourAnchor tour="pod-details" anchor="pod-book">
          <XStack alignItems="center" gap={12} paddingHorizontal={16} paddingVertical={10}>
            {isHost ? <HostBar onGoToDashboard={onGoToDashboard} /> : null}
            {showClosedNotice ? <ClosedNotice ongoing={phase === 'ONGOING'} /> : null}
            {!isHost && inProcess ? (
              <BackoutInProcessBar canCancel={canCancelBackout} onKeepSpot={onKeepSpot} />
            ) : null}
            {!isHost && !showClosedNotice && !inProcess && isMember ? (
              <MemberBookedBar
                canBackout={canBackout}
                isExpired={isExpired}
                releasedSeats={releasedSeats}
                canTakeSeatsBack={canCancelBackout}
                restoringSpot={restoringSpot}
                onBackout={onBackout}
                onKeepSpot={onKeepSpot}
              />
            ) : null}
            {showBookBar ? (
              <PodBookBar
                isFree={isFree}
                isFull={isFull}
                podAmount={pod.pod_amount}
                seats={seats}
                maxSeats={Number(membershipState?.max_seats_per_booking ?? 1)}
                onSeatsChange={onSeatsChange}
                onCheckout={onCheckout}
              />
            ) : null}
          </XStack>
        </TourAnchor>
      </SafeAreaView>
    </YStack>
  );
}

/** Host state: the host is auto-enrolled and never books their own pod — the
 * CTA jumps into Host Studio instead (mirrors mWeb's PodActionPanel). */
function HostBar({ onGoToDashboard }: Readonly<{ onGoToDashboard: () => void }>) {
  const { onPrimary } = useThemeColors();
  const { t } = useTranslation();
  return (
    <>
      <YStack flex={1}>
        <Text fontSize={11} color="$muted">
          {t('mweb.podDetails.youreHosting')}
        </Text>
        <Text fontSize={16} fontWeight="700" color="$color">
          {t('mweb.podDetails.yourPod')}
        </Text>
      </YStack>
      <XStack
        testID="pod-go-dashboard"
        role="button"
        aria-label={t('mweb.podDetails.goToDashboard')}
        onPress={onGoToDashboard}
        alignItems="center"
        justifyContent="center"
        paddingHorizontal={28}
        height={48}
        borderRadius={999}
        backgroundColor="$primary"
        pressStyle={{ opacity: 0.85 }}
      >
        <Text fontSize={15} fontWeight="700" color={onPrimary}>
          {t('mweb.podDetails.goToDashboard')}
        </Text>
      </XStack>
    </>
  );
}

/** Started state: booking is closed, no CTA. A pod that is still RUNNING gets
 * its own sentence — telling a member it has "already taken place" while it is
 * happening is the thing the Ongoing rail exists to stop saying. */
function ClosedNotice({ ongoing }: Readonly<{ ongoing: boolean }>) {
  const { t } = useTranslation();
  const message = ongoing
    ? t('mweb.podDetails.bookingClosedOngoing')
    : t('mweb.podDetails.bookingClosed');
  return (
    <XStack flex={1} alignItems="center" gap={8} testID="pod-booking-closed">
      <MaterialIcons name="event-busy" size={20} color={semantic.warning} />
      <Text flex={1} fontSize={13.5} fontWeight="600" color="$muted">
        {message}
      </Text>
    </XStack>
  );
}
