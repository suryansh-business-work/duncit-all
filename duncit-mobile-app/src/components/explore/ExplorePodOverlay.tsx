import { StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, XStack, YStack } from 'tamagui';

import type { ExplorePod } from '@/stores/explore.store';
import { podDateLabel, podPriceLabel } from '@/utils/pod-format';

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
  bottom?: number;
}

/** The dark gradient scrim + pod info (club, title, description, chips) anchored
 * above the CTA bar of a reel. RN port of mWeb's ExplorePodOverlay. */
export function ExplorePodOverlay({ pod, clubName, bottom = 150 }: Readonly<ExplorePodOverlayProps>) {
  const isFree = pod.pod_type.includes('FREE');
  const place =
    [pod.place_label, pod.place_detail].filter(Boolean).join(' · ') || pod.zone_name || '';

  return (
    <>
      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.02)', 'rgba(0,0,0,0.9)']}
        locations={[0, 0.34, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <YStack position="absolute" left={16} right={80} bottom={bottom} gap={8}>
        {clubName ? (
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
          </XStack>
        ) : null}
        <Text color="#ffffff" fontSize={22} fontWeight="900" numberOfLines={2}>
          {pod.pod_title}
        </Text>
        {pod.pod_description ? (
          <Text color="rgba(255,255,255,0.9)" fontSize={13} numberOfLines={2}>
            {pod.pod_description}
          </Text>
        ) : null}
        <XStack gap={8} flexWrap="wrap">
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
