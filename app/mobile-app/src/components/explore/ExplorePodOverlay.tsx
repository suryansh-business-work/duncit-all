import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, XStack, YStack } from 'tamagui';

import { PressScale } from '@/animations/PressScale';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { ExplorePod } from '@/stores/explore.store';
import { podDateLabel, podPriceLabel } from '@/utils/pod-format';
import { PRESS_STYLE } from '@duncit/buttons-native';

const CAPTION_COLLAPSE_AT = 90;
/** Translucent white over the scrim — every chip and the club disc on a reel. */
const GLASS = 'rgba(255,255,255,0.16)';

function Chip({ icon, label }: Readonly<{ icon?: string; label: string }>) {
  const { onPrimary } = useThemeColors();
  return (
    <XStack
      alignItems="center"
      gap={4}
      height={28}
      borderRadius={999}
      paddingHorizontal={12}
      backgroundColor={GLASS}
    >
      {icon ? <MaterialIcons name={icon as never} size={14} color={onPrimary} /> : null}
      <Text color="$onPrimary" fontSize={12} fontWeight="600">
        {label}
      </Text>
    </XStack>
  );
}

/** The tappable club row (disc + name + verified badge) at the top of the overlay. */
function ClubLink({
  clubName,
  isVerified,
  onOpenClub,
}: Readonly<{ clubName: string; isVerified?: boolean; onOpenClub?: () => void }>) {
  const { onPrimary } = useThemeColors();
  return (
    <PressScale testID="explore-club-link" accessibilityLabel={clubName} onPress={onOpenClub}>
      <XStack alignItems="center" gap={8}>
        <YStack
          width={26}
          height={26}
          borderRadius={13}
          backgroundColor={GLASS}
          alignItems="center"
          justifyContent="center"
        >
          <MaterialIcons name="groups" size={15} color={onPrimary} />
        </YStack>
        <Text color="$onPrimary" fontSize={14} fontWeight="600" numberOfLines={1}>
          {clubName}
        </Text>
        {isVerified ? (
          <MaterialIcons testID="explore-club-verified" name="verified" size={16} color="#1d9bf0" />
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
    <YStack
      pressStyle={PRESS_STYLE.surface}
      testID="explore-caption-wrap"
      onPress={collapsible ? onToggle : undefined}
    >
      <Text
        testID="explore-caption"
        color="$onPrimary"
        opacity={0.9}
        fontSize={14}
        numberOfLines={lines}
      >
        {description}
      </Text>
      {collapsible ? (
        <Text testID="explore-caption-toggle" color="$onPrimary" fontSize={12} fontWeight="600">
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
 * above the join bar of a reel. RN port of mWeb's ExplorePodOverlay. */
export function ExplorePodOverlay({
  pod,
  clubName,
  isVerified,
  onOpenClub,
  bottom = 150,
}: Readonly<ExplorePodOverlayProps>) {
  const [expanded, setExpanded] = useState(false);
  const description = pod.pod_description ?? '';
  const collapsible = description.length > CAPTION_COLLAPSE_AT;
  const toggleCaption = () => setExpanded((v) => !v);

  return (
    <>
      <LinearGradient
        colors={['rgba(0,0,0,0.42)', 'rgba(0,0,0,0.02)', 'rgba(0,0,0,0.88)']}
        locations={[0, 0.34, 1]}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      />
      <YStack position="absolute" left={16} right={80} bottom={bottom} gap={8}>
        {clubName ? (
          <ClubLink clubName={clubName} isVerified={isVerified} onOpenClub={onOpenClub} />
        ) : null}
        <Text color="$onPrimary" fontSize={22} fontWeight="600" lineHeight={26} numberOfLines={2}>
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
          <Chip label={podPriceLabel(pod)} />
          {pod.pod_date_time ? <Chip icon="event" label={podDateLabel(pod)} /> : null}
        </XStack>
      </YStack>
    </>
  );
}
