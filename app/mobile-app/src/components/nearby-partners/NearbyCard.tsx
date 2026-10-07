import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { PartnerAvatar } from '@/components/pod-requests/PartnerAvatar';
import { PodRequestStatusChip } from '@/components/pod-requests/PodRequestStatusChip';
import { formatPodRequestKm } from '@duncit/utils';
import type { NearbyItem } from '@/hooks/useNearbyPartners';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  item: NearbyItem;
  /** No requests left this month. */
  disabled: boolean;
  onRequest: (item: NearbyItem) => void;
}

/** A nearby host or venue: photo, name, category, place, distance and "Request Pod". */
export function NearbyCard({ item, disabled, onRequest }: Readonly<Props>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  return (
    <SurfaceCard testID={`nearby-card-${item.id}`} gap={12}>
      <XStack alignItems="center" gap={12}>
        <PartnerAvatar kind={item.kind} imageUrl={item.imageUrl} size={64} />
        <YStack flex={1} gap={2}>
          <Text fontSize={16} fontWeight="700" color="$color" numberOfLines={1}>
            {item.name}
          </Text>
          {item.category ? (
            <Text fontSize={13} color="$muted" numberOfLines={1}>
              {item.category}
            </Text>
          ) : null}
          {item.place ? (
            <Text fontSize={13} color="$muted" numberOfLines={1}>
              {item.place}
            </Text>
          ) : null}
          <Text fontSize={12} fontWeight="600" color="$primary">
            {t('podRequests.distanceAway', { vars: { km: formatPodRequestKm(item.distanceKm) } })}
          </Text>
        </YStack>
      </XStack>
      <XStack justifyContent="flex-end">
        {item.openStatus ? (
          <PodRequestStatusChip status={item.openStatus} testID={`nearby-card-status-${item.id}`} />
        ) : (
          <DuncitButton
            testID={`nearby-card-request-${item.id}`}
            label={t('podRequests.requestPod')}
            accessibilityLabel={`${t('podRequests.requestPod')}, ${item.name}`}
            size="sm"
            icon={<MaterialIcons name="send" size={16} color={onPrimary} />}
            disabled={disabled}
            onPress={() => onRequest(item)}
          />
        )}
      </XStack>
    </SurfaceCard>
  );
}
