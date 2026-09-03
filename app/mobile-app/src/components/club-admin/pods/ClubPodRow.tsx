import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { POD_ROW_STATUS_COLORS, podRowStatus, podRowStatusLabel } from '@duncit/utils';

import type { ClubAdminPodRow } from '@/hooks/useClubAdminPods';
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

/** One pod of the club: title, when, the shared status chip, seats and hosts. */
export function ClubPodRow({ pod, when, testID, onOpen, onActions }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color: ink } = useThemeColors();
  const tones = useToneColors();
  const status = podRowStatus(pod);
  const hosts = pod.host_names.filter(Boolean).join(', ');

  return (
    <YStack
      testID={testID}
      gap={8}
      padding={12}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <XStack alignItems="center" gap={8}>
        <YStack
          testID={`${testID}-open`}
          role="button"
          aria-label={pod.pod_title}
          onPress={onOpen}
          flex={1}
          gap={4}
          pressStyle={PRESS_STYLE.control}
        >
          <Text fontSize={14.5} fontWeight="600" color="$color" numberOfLines={1}>
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
        </YStack>
        <XStack
          testID={`${testID}-actions`}
          role="button"
          aria-label={t('mweb.hostManage.podActions')}
          onPress={onActions}
          width={40}
          height={40}
          alignItems="center"
          justifyContent="center"
          borderRadius={10}
          borderWidth={1}
          borderColor="$borderColor"
          pressStyle={PRESS_STYLE.row}
        >
          <MaterialIcons name="more-vert" size={18} color={ink} />
        </XStack>
      </XStack>
      <XStack gap={10}>
        <MetricCell
          testID={`${testID}-spots`}
          label={t('mweb.studioPods.spots')}
          value={[pod.seats_taken, pod.no_of_spots].join(' / ')}
        />
        <MetricCell
          testID={`${testID}-hosts`}
          label={t('mweb.studioPods.hosts')}
          value={hosts || t('mweb.studioPods.hostsNone')}
        />
      </XStack>
    </YStack>
  );
}
