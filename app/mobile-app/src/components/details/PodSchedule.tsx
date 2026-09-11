import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { JoinMeetingButton } from '@/components/details/JoinMeetingButton';
import { PodMetaRow } from '@/components/details/PodMetaRow';
import { MapEmbed } from '@/components/MapEmbed';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import type { PodDetail, PodLocation, PodVenue } from '@/hooks/useDetails';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { formatMeetingPlatform, podScheduleLabel } from '@/utils/pod-format';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  pod: PodDetail;
  venue: PodVenue | null;
  location: PodLocation | null;
  onOpenVenue?: (venueId: string) => void;
  /** Fetches the meeting link through `joinPodMeeting` — the call that marks
   * the booking present — and resolves with the URL to open. */
  onJoinMeeting: () => Promise<string>;
}

function venueParts(v: PodVenue): string[] {
  return [
    v.venue_name,
    v.address_line1,
    v.address_line2,
    v.locality,
    v.city,
    v.state,
    v.postal_code,
    v.country,
  ].filter((p): p is string => !!p);
}

/** The meta rows' value line — ink, medium weight. */
function Value({ children }: Readonly<{ children: string }>) {
  return (
    <Text fontSize={14} fontWeight="600" color="$color">
      {children}
    </Text>
  );
}

/** Time & Venue: when it runs, then where (or how to join, for a virtual pod),
 * each as an icon row, with the map under it. RN port of mWeb's PodMapSection —
 * handles both pod modes and degrades gracefully. */
export function PodSchedule({ pod, venue, location, onOpenVenue, onJoinMeeting }: Readonly<Props>) {
  const { primary } = useThemeColors();
  const { t } = useTranslation();
  const isVirtual = pod.pod_mode === 'VIRTUAL';
  const zone = location?.location_zones.find((z) => z.zone_name === pod.zone_name);
  const pincode = zone?.pincode || location?.location_pincode || '';
  const placeText = venue
    ? venueParts(venue).join(', ')
    : location?.location_name || pod.zone_name || '';
  let mapQuery: string;
  if (venue) {
    mapQuery =
      venue.lat != null && venue.lng != null
        ? `${venue.lat},${venue.lng}`
        : venueParts(venue).join(', ');
  } else {
    mapQuery = [pod.zone_name, location?.location_name, pincode, 'India']
      .filter(Boolean)
      .join(', ');
  }

  return (
    <SurfaceCard testID="pod-schedule" marginHorizontal={16} marginTop={20} gap={16}>
      <SectionHeader title={t('mweb.podDetails.timeAndVenue')} />
      <PodMetaRow icon="event">
        <Value>{podScheduleLabel(pod.pod_date_time, pod.pod_end_date_time, t)}</Value>
      </PodMetaRow>

      {isVirtual ? (
        <YStack gap={12}>
          <PodMetaRow icon="videocam">
            <Value>{formatMeetingPlatform(pod.meeting_platform, t)}</Value>
          </PodMetaRow>
          {/* The link is only on the pod for joined members; opening it goes
              through the mutation so the member is marked present. */}
          {pod.meeting_url ? (
            <JoinMeetingButton onJoinMeeting={onJoinMeeting} />
          ) : (
            <Text fontSize={13} color="$muted">
              {t('mweb.podDetails.meetingLinkAfterJoin')}
            </Text>
          )}
          {pod.meeting_notes ? (
            <Text fontSize={13} color="$muted">
              {pod.meeting_notes}
            </Text>
          ) : null}
        </YStack>
      ) : (
        <YStack gap={12}>
          <PodMetaRow icon="place">
            <Value>{placeText || '—'}</Value>
            {venue ? (
              <XStack
                testID="pod-venue-details"
                role="button"
                aria-label={t('mweb.podDetails.venueDetails')}
                onPress={() => onOpenVenue?.(venue.id)}
                alignItems="center"
                gap={6}
                alignSelf="flex-start"
                paddingVertical={4}
                pressStyle={PRESS_STYLE.row}
              >
                <Text fontSize={13} fontWeight="600" color="$primary">
                  {t('mweb.podDetails.venueDetails')}
                </Text>
                <MaterialIcons name="open-in-new" size={14} color={primary} />
              </XStack>
            ) : null}
          </PodMetaRow>
          <MapEmbed query={mapQuery} />
        </YStack>
      )}
    </SurfaceCard>
  );
}
