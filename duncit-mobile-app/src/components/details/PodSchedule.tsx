import type { ReactNode } from 'react';
import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { MapEmbed } from '@/components/MapEmbed';
import type { PodDetail, PodLocation, PodVenue } from '@/hooks/useDetails';
import { useThemeColors } from '@/hooks/useThemeColors';
import { podScheduleLabel } from '@/utils/pod-format';

interface Props {
  pod: PodDetail;
  venue: PodVenue | null;
  location: PodLocation | null;
  onOpenVenue?: (venueId: string) => void;
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
export function PodSchedule({ pod, venue, location, onOpenVenue }: Readonly<Props>) {
  const { primary, onPrimary } = useThemeColors();
  const isVirtual = pod.pod_mode === 'VIRTUAL';
  const zone = location?.location_zones.find((z) => z.zone_name === pod.zone_name);
  const pincode = zone?.pincode || location?.location_pincode || '';
  const placeText = venue
    ? venueParts(venue).join(', ')
    : location?.location_name || pod.zone_name || '';
  let mapQuery: string;
  if (venue) {
    mapQuery = venue.lat != null && venue.lng != null ? `${venue.lat},${venue.lng}` : venueParts(venue).join(', ');
  } else {
    mapQuery = [pod.zone_name, location?.location_name, pincode, 'India'].filter(Boolean).join(', ');
  }

  return (
    <YStack paddingHorizontal={16} gap={14}>
      <Field label="When">
        <Text fontSize={14} fontWeight="700" color="$color">
          {podScheduleLabel(pod.pod_date_time, pod.pod_end_date_time)}
        </Text>
      </Field>

      {isVirtual ? (
        <>
          <Field label="Meeting">
            <Text fontSize={14} fontWeight="700" color="$color">
              {pod.meeting_platform || 'Online'}
            </Text>
          </Field>
          {pod.meeting_url ? (
            <XStack
              testID="pod-join-meeting"
              role="button"
              aria-label="Join meeting"
              onPress={() => Linking.openURL(pod.meeting_url as string)}
              alignSelf="flex-start"
              alignItems="center"
              gap={8}
              paddingHorizontal={18}
              height={44}
              borderRadius={999}
              backgroundColor="$primary"
              pressStyle={{ opacity: 0.85 }}
            >
              <MaterialIcons name="videocam" size={18} color={onPrimary} />
              <Text fontSize={14} fontWeight="900" color={onPrimary}>
                Join meeting
              </Text>
            </XStack>
          ) : (
            <Text fontSize={13} color="$muted">
              Meeting link will be visible after joining this pod.
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
          <Field label="Where">
            <Text fontSize={14} fontWeight="700" color="$color">
              {placeText || '—'}
            </Text>
          </Field>
          {venue ? (
            <XStack
              testID="pod-venue-details"
              role="button"
              aria-label="Venue details"
              onPress={() => onOpenVenue?.(venue.id)}
              alignItems="center"
              gap={6}
              alignSelf="flex-start"
              pressStyle={{ opacity: 0.7 }}
            >
              <Text fontSize={14} fontWeight="800" color="$primary">
                Venue details
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
