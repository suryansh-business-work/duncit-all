import { Text, XStack, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { PartnerAvatar } from '@/components/pod-requests/PartnerAvatar';
import { PodRequestStatusChip } from '@/components/pod-requests/PodRequestStatusChip';
import { formatPodRequestKm } from '@duncit/utils';
import type { PodRequestDetail } from '@/hooks/usePodRequestDetail';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  request: PodRequestDetail;
}

/** Who the request is with: the venue (to a host) or the host (to a venue owner) — never their contact. */
export function CounterpartCard({ request }: Readonly<Props>) {
  const { t } = useTranslation();
  const isVenue = request.viewer_side === 'HOST';
  const { venue, host } = request;
  const name = (isVenue ? venue?.venue_name : host?.name) ?? '';
  const image = (isVenue ? venue?.cover_image_url : host?.photo_url) ?? '';
  const capacity = venue?.capacity ?? 0;
  const venueLines = [
    [venue?.category, venue?.venue_type].filter(Boolean).join(' · '),
    capacity > 0 ? t('podRequests.capacity', { vars: { count: capacity } }) : '',
    [venue?.locality, venue?.city].filter(Boolean).join(', '),
  ];
  const lines = (isVenue ? venueLines : [(host?.categories ?? []).join(' · ')]).filter(Boolean);
  const distance = request.distance_km;

  return (
    <SurfaceCard testID="pod-request-counterpart" gap={14}>
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={12} fontWeight="600" color="$muted">
          {isVenue ? t('podRequests.venueDetails') : t('podRequests.hostDetails')}
        </Text>
        <PodRequestStatusChip status={request.status} testID="pod-request-status" />
      </XStack>
      <XStack alignItems="center" gap={12}>
        <PartnerAvatar kind={isVenue ? 'VENUE' : 'HOST'} imageUrl={image} size={72} />
        <YStack flex={1} gap={2}>
          <Text role="heading" fontSize={18} fontWeight="700" color="$color">
            {name}
          </Text>
          {lines.map((line) => (
            <Text key={line} fontSize={13} color="$muted">
              {line}
            </Text>
          ))}
          {distance === null || distance === undefined ? null : (
            <Text fontSize={12} fontWeight="600" color="$primary">
              {t('podRequests.distanceAway', { vars: { km: formatPodRequestKm(distance) } })}
            </Text>
          )}
        </YStack>
      </XStack>
      {request.note ? (
        <YStack gap={2}>
          <Text fontSize={12} fontWeight="600" color="$muted">
            {t('podRequests.noteTitle')}
          </Text>
          <Text fontSize={14} color="$color">
            {request.note}
          </Text>
        </YStack>
      ) : null}
    </SurfaceCard>
  );
}
