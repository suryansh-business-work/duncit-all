import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { JoinMeetingButton } from '@/components/details/JoinMeetingButton';
import { MapEmbed } from '@/components/MapEmbed';
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

function Field({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <YStack gap={3}>
      <Text fontSize={12} color="$muted">
        {label}
      </Text>
      {children}
    </YStack>
  );
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

/** When · Meeting (virtual) or Where + map (physical). RN port of mWeb's
 * PodMapSection — handles both pod modes and degrades gracefully. */
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
    <YStack
      testID="pod-schedule"
      margin={16}
      padding={16}
      gap={14}
      borderRadius={18}
      backgroundColor="$background"
      borderWidth={1}
      borderColor="$borderColor"
    >
      <XStack gap={8} alignItems="center">
        <MaterialIcons name="event" size={20} color={primary} />
        <Text fontSize={16} fontWeight="700" color="$color">
          {t('mweb.podDetails.timeAndVenue')}
        </Text>
      </XStack>
      <Field label={t('mweb.podDetails.when')}>
        <Text fontSize={14} fontWeight="700" color="$color">
          {podScheduleLabel(pod.pod_date_time, pod.pod_end_date_time, t)}
        </Text>
      </Field>

      {isVirtual ? (
        <>
          <Field label={t('mweb.podDetails.meeting')}>
            <Text fontSize={14} fontWeight="700" color="$color">
              {formatMeetingPlatform(pod.meeting_platform, t)}
            </Text>
          </Field>
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
        </>
      ) : (
        <>
          <Field label={t('mweb.podDetails.where')}>
            <Text fontSize={14} fontWeight="700" color="$color">
              {placeText || '—'}
            </Text>
          </Field>
          {venue ? (
            <XStack
              testID="pod-venue-details"
              role="button"
              aria-label={t('mweb.podDetails.venueDetails')}
              onPress={() => onOpenVenue?.(venue.id)}
              alignItems="center"
              gap={6}
              alignSelf="flex-start"
              pressStyle={PRESS_STYLE.row}
            >
              <Text fontSize={14} fontWeight="600" color="$primary">
                {t('mweb.podDetails.venueDetails')}
              </Text>
              <MaterialIcons name="open-in-new" size={14} color={primary} />
            </XStack>
          ) : null}
          <MapEmbed query={mapQuery} />
        </>
      )}
    </YStack>
  );
}
