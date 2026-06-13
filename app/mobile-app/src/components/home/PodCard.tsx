import { Image, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, XStack, YStack } from 'tamagui';

import { PressScale } from '@/animations/PressScale';
import type { HomePod } from '@/hooks/useHomeFeed';
import { podDateLabel, podImageUrl, podPlaceLabel, podPriceLabel } from '@/utils/pod-format';

interface PodCardProps {
  pod: HomePod;
  width?: number;
  onPress?: () => void;
  /** Show the place/address line. Off in the home feed (addresses are hidden there). */
  showPlace?: boolean;
}

/** Image-background pod tile — RN port of mWeb's featured/club pod card. Shows the
 * date, title, spots, price and place over a darkening gradient. */
export function PodCard({ pod, width = 300, onPress, showPlace = true }: Readonly<PodCardProps>) {
  const image = podImageUrl(pod);
  const place = showPlace ? podPlaceLabel(pod) : '';

  return (
    <PressScale
      testID={`pod-card-${pod.pod_id}`}
      accessibilityLabel={pod.pod_title}
      onPress={onPress}
    >
      <YStack
        width={width}
        height={230}
        borderRadius={18}
        overflow="hidden"
        backgroundColor="$muted"
      >
        {image ? (
          <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <YStack flex={1} alignItems="center" justifyContent="center">
            <MaterialIcons name="event" size={56} color="rgba(255,255,255,0.85)" />
          </YStack>
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.86)']}
          style={StyleSheet.absoluteFill}
        />
        <YStack flex={1} justifyContent="flex-end" padding={14} gap={6}>
          <XStack>
            <XStack
              alignItems="center"
              gap={4}
              backgroundColor="rgba(255,255,255,0.18)"
              borderRadius={999}
              paddingHorizontal={10}
              paddingVertical={4}
            >
              <MaterialIcons name="event" size={13} color="#ffffff" />
              <Text color="#ffffff" fontSize={11} fontWeight="800">
                {podDateLabel(pod)}
              </Text>
            </XStack>
          </XStack>
          <Text color="#ffffff" fontSize={17} fontWeight="900" numberOfLines={2}>
            {pod.pod_title}
          </Text>
          <XStack alignItems="center" gap={6}>
            <MaterialIcons name="group" size={14} color="#ffffff" />
            <Text color="#ffffff" fontSize={12} fontWeight="700">
              {pod.no_of_spots > 0 ? `${pod.no_of_spots} spots` : 'Open'}
            </Text>
            <Text color="#ffffff" fontSize={12} fontWeight="900">
              · {podPriceLabel(pod)}
            </Text>
          </XStack>
          {place ? (
            <XStack alignItems="center" gap={4}>
              <MaterialIcons name="place" size={13} color="rgba(255,255,255,0.9)" />
              <Text color="rgba(255,255,255,0.9)" fontSize={11} fontWeight="700" numberOfLines={1}>
                {place}
              </Text>
            </XStack>
          ) : null}
        </YStack>
      </YStack>
    </PressScale>
  );
}
