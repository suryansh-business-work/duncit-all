import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, XStack, YStack } from 'tamagui';

import { PressScale } from '@/animations/PressScale';
import type { ExplorePod } from '@/stores/explore.store';
import { podDateLabel, podPriceLabel } from '@/utils/pod-format';

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

/** The tappable club row (avatar + name + verified badge) at the top of the overlay. */
function ClubLink({
  clubName,
  isVerified,
  onOpenClub,
}: Readonly<{ clubName: string; isVerified?: boolean; onOpenClub?: () => void }>) {
  return (
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
          <MaterialIcons testID="explore-club-verified" name="verified" size={15} color="#1d9bf0" />
        ) : null}
      </XStack>
    </PressScale>
  );
}

/** The pod description, clamped to 2 lines with a More / Show less toggle when long. */
function Caption({
  description,
  collapsible,
  expanded,
  onToggle,
}: Readonly<{
  description: string;
  collapsible: boolean;
  expanded: boolean;
  onToggle: () => void;
}>) {
  const lines = collapsible && !expanded ? 2 : undefined;
  const toggleLabel = expanded ? 'Show less' : 'More';

  return (
    <YStack testID="explore-caption-wrap" onPress={collapsible ? onToggle : undefined}>
      <Text
        testID="explore-caption"
        color="rgba(255,255,255,0.9)"
        fontSize={13}
        numberOfLines={lines}
      >
        {description}
      </Text>
      {collapsible ? (
        <Text testID="explore-caption-toggle" color="#ffffff" fontSize={12} fontWeight="800">
          {toggleLabel}
        </Text>
      ) : null}
    </YStack>
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
  const description = pod.pod_description ?? '';
  const collapsible = description.length > CAPTION_COLLAPSE_AT;
  const toggleCaption = () => setExpanded((v) => !v);

  return (
    <>
      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.02)', 'rgba(0,0,0,0.9)']}
        locations={[0, 0.34, 1]}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      />
      <YStack position="absolute" left={16} right={80} bottom={bottom} gap={8}>
        {clubName ? (
          <ClubLink clubName={clubName} isVerified={isVerified} onOpenClub={onOpenClub} />
        ) : null}
        <Text color="#ffffff" fontSize={22} fontWeight="900" numberOfLines={2}>
          {pod.pod_title}
        </Text>
        {description ? (
          <Caption
            description={description}
            collapsible={collapsible}
            expanded={expanded}
            onToggle={toggleCaption}
          />
        ) : null}
        <XStack gap={8} flexWrap="wrap">
          <Chip
            label={podPriceLabel(pod)}
            tint={isFree ? 'rgba(34,197,94,0.32)' : 'rgba(255,79,115,0.5)'}
          />
          {pod.pod_date_time ? <Chip icon="event" label={podDateLabel(pod)} /> : null}
        </XStack>
      </YStack>
    </>
  );
}
