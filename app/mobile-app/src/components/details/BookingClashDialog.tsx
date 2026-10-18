import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { DuncitDialog } from '@/components/DuncitDialog';
import { ConfirmFooter } from '@/components/DuncitDialog/ConfirmFooter';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime, formatTime } from '@/utils/date-format';
import type { BookingClashGuard } from '@/screens/PodDetailsScreen/useBookingClashGuard';

interface Props {
  guard: Pick<BookingClashGuard, 'pods' | 'answer'>;
  /** Opens a clashing pod so the member can free that spot. */
  onOpenPod: (clubSlug: string, podSlug: string) => void;
}

/**
 * "You already have a pod at this time": every booked pod that overlaps, each
 * openable so the member can free that spot, then Force book or Cancel
 * booking. Opening a clashing pod cancels this booking — the member is leaving
 * to sort out the other one first. mWeb twin: clash/BookingClashDialog.
 */
export function BookingClashDialog({ guard, onOpenPod }: Readonly<Props>) {
  const { t } = useTranslation();
  const { warning, primary } = useThemeColors();
  const { pods, answer } = guard;
  const count = pods.length;
  const cancel = () => answer(false);
  return (
    <DuncitDialog
      open={count > 0}
      onClose={cancel}
      testID="booking-clash-dialog"
      title={t('mweb.bookingClash.title', { count })}
      closeLabel={t('mweb.bookingClash.cancelBooking')}
      footer={
        <ConfirmFooter
          cancelLabel={t('mweb.bookingClash.cancelBooking')}
          confirmLabel={t('mweb.bookingClash.forceBook')}
          busy={false}
          destructive={false}
          cancelTestID="booking-clash-cancel"
          confirmTestID="booking-clash-force"
          onCancel={cancel}
          onConfirm={() => answer(true)}
        />
      }
    >
      <YStack gap={14}>
        <Text fontSize={14} color="$color">
          {t('mweb.bookingClash.intro')}
        </Text>
        {pods.map((pod) => (
          <XStack
            key={pod.pod_id}
            gap={10}
            alignItems="flex-start"
            testID={`booking-clash-row-${pod.pod_id}`}
          >
            <MaterialIcons name="event-busy" size={22} color={warning} />
            <YStack gap={2} flexShrink={1}>
              <Text fontSize={15} fontWeight="600" color="$color">
                {pod.pod_title}
              </Text>
              <Text fontSize={13} color="$muted">
                {t('mweb.bookingClash.when', {
                  vars: {
                    start: formatDateTime(pod.pod_date_time),
                    end: formatTime(pod.pod_end_date_time),
                  },
                })}
              </Text>
              {pod.club_slug && pod.pod_slug ? (
                <Text
                  testID={`booking-clash-open-${pod.pod_id}`}
                  role="link"
                  tabIndex={0}
                  fontSize={13}
                  fontWeight="600"
                  color={primary}
                  pressStyle={PRESS_STYLE.control}
                  onPress={() => {
                    cancel();
                    onOpenPod(pod.club_slug, pod.pod_slug);
                  }}
                >
                  {t('mweb.bookingClash.openPod')}
                </Text>
              ) : null}
            </YStack>
          </XStack>
        ))}
        <Text fontSize={13} color="$muted" testID="booking-clash-advice">
          {t('mweb.bookingClash.advice')}
        </Text>
      </YStack>
    </DuncitDialog>
  );
}
