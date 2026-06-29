import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, XStack, YStack } from 'tamagui';

import { PressScale } from '@/animations/PressScale';
import type { ExplorePod } from '@/stores/explore.store';
import { podDateLabel, podPriceLabel, podStatus, podStatusBadge } from '@/utils/pod-format';

const CAPTION_COLLAPSE_AT = 90;

function Chip({ icon, label, tint }: Readonly<{ icon?: string; label: string; tint?: string }>) {
  return (
    <XStack
      alignItems="center"
      gap={4}
      borderRadius={999}
      paddingHorizontal={10}
      paddingVertical={5}
      backgroundColor={tint ?? 'rgba(255,255,255,0.16)'}
    >
      {icon ? <MaterialIcons name={icon as never} size={13} color="#ffffff" /> : null}
      <Text color="#ffffff" fontSize={11.5} fontWeight="800">
        {label}
      </Text>
    </XStack>
  );
}

interface ExplorePodOverlayProps {
  pod: ExplorePod;
  clubName?: string;
  isVerified?: boolean;
  onOpenClub?: () => void;
  bottom?: number;
}

/** The dark gradient scrim + pod info (club, title, description, chips) anchored
 * above the CTA bar of a reel. RN port of mWeb's ExplorePodOverlay. */
export function ExplorePodOverlay({
  pod,
  clubName,
  isVerified,
  onOpenClub,
  bottom = 150,
}: Readonly<ExplorePodOverlayProps>) {
  const [expanded, setExpanded] = useState(false);
  const isFree = pod.pod_type.includes('FREE');
  const place =
    [pod.place_label, pod.place_detail].filter(Boolean).join(' · ') || pod.zone_name || '';
  const description = pod.pod_description ?? '';
  const collapsible = description.length > CAPTION_COLLAPSE_AT;
  // Event status + capacity badges (explore item 16).
  const spots = pod.no_of_spots;
  const attendees = pod.pod_attendees.length;
  const soldOut = spots > 0 && attendees >= spots;
  const statusBadge = podStatusBadge(podStatus(pod.pod_date_time));

  return (
    <>
      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.02)', 'rgba(0,0,0,0.9)']}
        locations={[0, 0.34, 1]}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      />
      <YStack position="absolute" left={16} right={80} bottom={bottom} gap={8}>
        {clubName ? (
          <PressScale testID="explore-club-link" accessibilityLabel={clubName} onPress={onOpenClub}>
            <XStack alignItems="center" gap={8}>
              <YStack
                width={24}
                height={24}
                borderRadius={12}
                backgroundColor="$primary"
                alignItems="center"
                justifyContent="center"
              >
                <MaterialIcons name="groups" size={14} color="#ffffff" />
              </YStack>
              <Text color="#ffffff" fontSize={13} fontWeight="900" numberOfLines={1}>
                {clubName}
              </Text>
              {isVerified ? (
                <MaterialIcons
                  testID="explore-club-verified"
                  name="verified"
                  size={15}
                  color="#1d9bf0"
                />
              ) : null}
            </XStack>
          </PressScale>
        ) : null}
        <Text color="#ffffff" fontSize={22} fontWeight="900" numberOfLines={2}>
          {pod.pod_title}
        </Text>
        {description ? (
          <YStack
            testID="explore-caption-wrap"
            onPress={collapsible ? () => setExpanded((v) => !v) : undefined}
          >
            <Text
              testID="explore-caption"
              color="rgba(255,255,255,0.9)"
              fontSize={13}
              numberOfLines={collapsible && !expanded ? 2 : undefined}
            >
              {description}
            </Text>
            {collapsible ? (
              <Text testID="explore-caption-toggle" color="#ffffff" fontSize={12} fontWeight="800">
                {expanded ? 'Show less' : 'More'}
              </Text>
            ) : null}
          </YStack>
        ) : null}
        <XStack gap={8} flexWrap="wrap">
          <Chip
            label={soldOut ? 'Sold Out' : statusBadge.label}
            tint={soldOut ? 'rgba(239,68,68,0.85)' : statusBadge.tint}
          />
          {spots > 0 ? <Chip icon="group" label={`${attendees}/${spots}`} /> : null}
          <Chip
            label={podPriceLabel(pod)}
            tint={isFree ? 'rgba(34,197,94,0.32)' : 'rgba(255,79,115,0.5)'}
          />
          {pod.pod_date_time ? <Chip icon="event" label={podDateLabel(pod)} /> : null}
          {place ? <Chip icon="place" label={place} /> : null}
        </XStack>
      </YStack>
    </>
  );
}
