import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { formatMoney, POD_ROW_STATUS_COLORS, podRowStatus, podRowStatusLabel } from '@duncit/utils';

import type { ClubAdminPodRow } from '@/hooks/useClubAdminPods';
import { usePublicFinance } from '@/hooks/usePublicFinance';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { MetricCell } from '../MetricCell';
import { ToneChip } from '../ToneChip';
import { useToneColors } from '../tone';

interface Props {
  pod: ClubAdminPodRow;
  /** Start of the pod, already in the admin's date/time settings (rule 11). */
  when: string;
  testID: string;
  /** Opens the pod's detail. */
  onOpen: () => void;
  /** Opens the actions sheet — every per-pod action lives behind it. */
  onActions: () => void;
}

/** One pod of the club, as a row of the pods card: title, when, the shared
 * status chip, seats and hosts. */
export function ClubPodRow({ pod, when, testID, onOpen, onActions }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color: ink } = useThemeColors();
  const { currency } = usePublicFinance();
  const tones = useToneColors();
  const status = podRowStatus(pod);
  const hosts = pod.host_names.filter(Boolean).join(', ');
  // "Nobody scanned" is not "nobody came", so an unrecorded pod says so rather
  // than reporting a confident 0 — the same distinction `recorded` draws on the
  // server and the MUI AttendanceChip draws in the portals.
  const attended = pod.attendance.recorded
    ? [pod.attendance.attended_seats, pod.attendance.booked_seats].join(' / ')
    : t('mweb.studioPods.attendedNone');
  // A free pod reads as free, never as a zero price — the same rule mWeb's
  // `podPriceLabel` applies, and the symbol is the admin-configured one rather
  // than a literal (rule 11).
  const price =
    pod.pod_type === 'FREE'
      ? t('mweb.podDetails.free')
      : formatMoney(pod.pod_amount, { symbol: currency });

  return (
    <YStack testID={testID} gap={10} paddingHorizontal={16} paddingVertical={14}>
      <XStack alignItems="center" gap={8}>
        <YStack
          testID={`${testID}-open`}
          tabIndex={0}
          role="button"
          aria-label={pod.pod_title}
          onPress={onOpen}
          flex={1}
          gap={6}
          pressStyle={PRESS_STYLE.control}
        >
          <Text fontSize={16} fontWeight="600" color="$color" numberOfLines={1}>
            {pod.pod_title}
          </Text>
          <XStack alignItems="center" gap={8}>
            <ToneChip
              testID={`${testID}-status`}
              label={podRowStatusLabel(status, t)}
              color={tones[POD_ROW_STATUS_COLORS[status]]}
            />
            <Text flex={1} fontSize={12} color="$muted" numberOfLines={1}>
              {when}
            </Text>
          </XStack>
          {pod.place_label ? (
            <Text testID={`${testID}-place`} fontSize={12} color="$muted" numberOfLines={1}>
              {pod.place_label}
            </Text>
          ) : null}
        </YStack>
        <XStack
          testID={`${testID}-actions`}
          tabIndex={0}
          role="button"
          aria-label={t('mweb.hostManage.podActions')}
          onPress={onActions}
          width={40}
          height={40}
          alignItems="center"
          justifyContent="center"
          borderRadius={20}
          backgroundColor="$soft"
          pressStyle={PRESS_STYLE.control}
        >
          <MaterialIcons name="more-vert" size={20} color={ink} />
        </XStack>
      </XStack>
      <XStack gap={10}>
        <MetricCell
          testID={`${testID}-spots`}
          label={t('mweb.studioPods.spots')}
          value={[pod.seats_taken, pod.no_of_spots].join(' / ')}
        />
        <MetricCell
          testID={`${testID}-attended`}
          label={t('mweb.studioPods.attended')}
          value={attended}
        />
        <MetricCell testID={`${testID}-ticket`} label={t('mweb.studioPods.ticket')} value={price} />
      </XStack>
      <XStack gap={10}>
        <MetricCell
          testID={`${testID}-hosts`}
          label={t('mweb.studioPods.hosts')}
          value={hosts || t('mweb.studioPods.hostsNone')}
        />
      </XStack>
    </YStack>
  );
}
