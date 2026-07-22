import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

import { BackoutInProcessBar } from '@/components/details/BackoutInProcessBar';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { PodDetail, PodMembershipState } from '@/hooks/useDetails';

interface Props {
  pod: PodDetail;
  isFree: boolean;
  isHost: boolean;
  membershipState: PodMembershipState | null;
  onCheckout: () => void;
  onBackout: () => void;
  onKeepSpot: () => void;
  onGoToDashboard: () => void;
}

/**
 * Sticky bottom booking bar. Reflects the viewer's membership so a pod that is
 * already booked shows "Pod Booked" (+ Backout) instead of offering to pay again
 * — matching mWeb's PodActionPanel. A booking in "Backout in process" offers
 * "Keep My Spot" until the released seat is rebooked. Full pods show a disabled
 * "Pod is full". The pod's own host never books their pod — they get a
 * "Go to Dashboard" CTA into Host Studio instead.
 */
export function PodBookingBar({
  pod,
  isFree,
  isHost,
  membershipState,
  onCheckout,
  onBackout,
  onKeepSpot,
  onGoToDashboard,
}: Readonly<Props>) {
  const isMember = !!membershipState?.is_member;
  const inProcess = !!membershipState?.backout_in_process;
  const canBackout = !!membershipState?.can_backout;
  const canCancelBackout = !!membershipState?.can_cancel_backout;
  const isFull = !isMember && !inProcess && membershipState?.can_join === false;
  // Once the pod's date has passed, booking is closed for non-members — the
  // server enforces the same rule on joinFree + payment order creation, so we
  // replace the CTA with a notice (mirrors mWeb's PodActionPanel).
  const isExpired = !!pod.pod_date_time && new Date(pod.pod_date_time).getTime() < Date.now();
  const showClosedNotice = !isHost && isExpired && !isMember && !inProcess;
  const showBookBar = !isHost && !showClosedNotice && !isMember && !inProcess;

  return (
    <YStack
      position="absolute"
      left={0}
      right={0}
      bottom={0}
      backgroundColor="$background"
      borderTopWidth={1}
      borderColor="$borderColor"
    >
      <SafeAreaView edges={['bottom']}>
        <XStack alignItems="center" gap={12} paddingHorizontal={16} paddingVertical={10}>
          {isHost ? <HostBar onGoToDashboard={onGoToDashboard} /> : null}
          {showClosedNotice ? <ClosedNotice /> : null}
          {!isHost && inProcess ? (
            <BackoutInProcessBar canCancel={canCancelBackout} onKeepSpot={onKeepSpot} />
          ) : null}
          {!isHost && !showClosedNotice && !inProcess && isMember ? (
            <MemberBar canBackout={canBackout} onBackout={onBackout} />
          ) : null}
          {showBookBar ? (
            <BookBar
              isFree={isFree}
              isFull={isFull}
              podAmount={pod.pod_amount}
              onCheckout={onCheckout}
            />
          ) : null}
        </XStack>
      </SafeAreaView>
    </YStack>
  );
}

/** Host state: the host is auto-enrolled and never books their own pod — the
 * CTA jumps into Host Studio instead (mirrors mWeb's PodActionPanel). */
function HostBar({ onGoToDashboard }: Readonly<{ onGoToDashboard: () => void }>) {
  const { onPrimary } = useThemeColors();
  return (
    <>
      <YStack flex={1}>
        <Text fontSize={11} color="$muted">
          You're hosting
        </Text>
        <Text fontSize={16} fontWeight="900" color="$color">
          Your Pod
        </Text>
      </YStack>
      <XStack
        testID="pod-go-dashboard"
        role="button"
        aria-label="Go to Dashboard"
        onPress={onGoToDashboard}
        alignItems="center"
        justifyContent="center"
        paddingHorizontal={28}
        height={48}
        borderRadius={999}
        backgroundColor="$primary"
        pressStyle={{ opacity: 0.85 }}
      >
        <Text fontSize={15} fontWeight="900" color={onPrimary}>
          Go to Dashboard
        </Text>
      </XStack>
    </>
  );
}

/** Past-date state: booking is closed, no CTA. */
function ClosedNotice() {
  return (
    <XStack flex={1} alignItems="center" gap={8} testID="pod-booking-closed">
      <MaterialIcons name="event-busy" size={20} color={semantic.warning} />
      <Text flex={1} fontSize={13.5} fontWeight="800" color="$muted">
        This pod has already taken place — booking is closed.
      </Text>
    </XStack>
  );
}

/** Booked state: "Pod Booked" badge with an optional Backout action. */
function MemberBar({
  canBackout,
  onBackout,
}: Readonly<{ canBackout: boolean; onBackout: () => void }>) {
  return (
    <>
      <XStack flex={1} alignItems="center" gap={8}>
        <MaterialIcons name="check-circle" size={22} color={semantic.success} />
        <YStack flex={1}>
          <Text fontSize={11} color="$muted">
            You're going
          </Text>
          <Text fontSize={16} fontWeight="900" color="$color" testID="pod-booked-label">
            Pod Booked
          </Text>
          {canBackout ? null : (
            <Text fontSize={10.5} color="$muted" testID="pod-backout-maxed">
              You have reached the maximum number of Backout attempts allowed for this Pod.
            </Text>
          )}
        </YStack>
      </XStack>
      {canBackout ? (
        <XStack
          testID="pod-backout"
          role="button"
          aria-label="Backout from pod"
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
          <Text fontSize={14} fontWeight="900" color="$danger">
            Backout
          </Text>
        </XStack>
      ) : null}
    </>
  );
}

interface BookBarProps {
  isFree: boolean;
  isFull: boolean;
  podAmount: number;
  onCheckout: () => void;
}

/** Not-yet-booked state: price + a Join/Book button (disabled when the pod is full). */
function BookBar({ isFree, isFull, podAmount, onCheckout }: Readonly<BookBarProps>) {
  const { onPrimary } = useThemeColors();
  const freeOrBookAria = isFree ? 'Join pod' : 'Book pod';
  const bookAriaLabel = isFull ? 'Pod is full' : freeOrBookAria;
  const freeOrBookText = isFree ? 'Join' : 'Book now';
  const bookText = isFull ? 'Pod is full' : freeOrBookText;
  return (
    <>
      <YStack flex={1}>
        <Text fontSize={11} color="$muted">
          {isFree ? 'Entry' : 'Price'}
        </Text>
        <Text fontSize={18} fontWeight="900" color="$color">
          {isFree ? 'Free' : `₹${podAmount}`}
        </Text>
      </YStack>
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
        pressStyle={{ opacity: 0.85 }}
      >
        <Text fontSize={15} fontWeight="900" color={onPrimary}>
          {bookText}
        </Text>
      </XStack>
    </>
  );
}
