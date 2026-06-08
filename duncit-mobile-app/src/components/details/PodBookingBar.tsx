import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { PodDetail, PodMembershipState } from '@/hooks/useDetails';

interface Props {
  pod: PodDetail;
  isFree: boolean;
  membershipState: PodMembershipState | null;
  onCheckout: () => void;
  onBackout: () => void;
}

/**
 * Sticky bottom booking bar. Reflects the viewer's membership so a pod that is
 * already booked shows "Pod Booked" (+ Backout) instead of offering to pay again
 * — matching mWeb's PodActionPanel. Full pods show a disabled "Pod is full".
 */
export function PodBookingBar({ pod, isFree, membershipState, onCheckout, onBackout }: Props) {
  const { onPrimary } = useThemeColors();
  const isMember = !!membershipState?.is_member;
  const canBackout = !!membershipState?.can_backout;
  const isFull = !isMember && membershipState?.can_join === false;

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
          {isMember ? (
            <>
              <XStack flex={1} alignItems="center" gap={8}>
                <MaterialIcons name="check-circle" size={22} color={semantic.success} />
                <YStack>
                  <Text fontSize={11} color="$muted">
                    You're going
                  </Text>
                  <Text fontSize={16} fontWeight="900" color="$color" testID="pod-booked-label">
                    Pod Booked
                  </Text>
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
          ) : (
            <>
              <YStack flex={1}>
                <Text fontSize={11} color="$muted">
                  {isFree ? 'Entry' : 'Price'}
                </Text>
                <Text fontSize={18} fontWeight="900" color="$color">
                  {isFree ? 'Free' : `₹${pod.pod_amount}`}
                </Text>
              </YStack>
              <XStack
                testID="pod-book"
                role="button"
                aria-label={isFull ? 'Pod is full' : isFree ? 'Join pod' : 'Book pod'}
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
                  {isFull ? 'Pod is full' : isFree ? 'Join' : 'Book now'}
                </Text>
              </XStack>
            </>
          )}
        </XStack>
      </SafeAreaView>
    </YStack>
  );
}
