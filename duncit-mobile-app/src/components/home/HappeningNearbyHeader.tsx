import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, XStack, YStack } from 'tamagui';

/** "Happening nearby" section header with the gradient flame badge and a live
 * pod count — RN port of the mWeb HomePage section heading. */
export function HappeningNearbyHeader({ totalPods }: { totalPods: number }) {
  return (
    <XStack alignItems="center" justifyContent="space-between" gap={10} paddingHorizontal={16}>
      <XStack alignItems="center" gap={10} flex={1}>
        <LinearGradient
          colors={['#ff4f73', '#ff7a59']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name="local-fire-department" size={20} color="#ffffff" />
        </LinearGradient>
        <YStack flex={1}>
          <Text fontSize={17} fontWeight="900" color="$color" numberOfLines={1}>
            Happening nearby
          </Text>
          <Text fontSize={12} fontWeight="700" color="$muted" numberOfLines={1}>
            Live pods around you
          </Text>
        </YStack>
      </XStack>
      <XStack
        borderRadius={999}
        borderWidth={1.5}
        borderColor="$primary"
        paddingHorizontal={12}
        paddingVertical={6}
      >
        <Text fontSize={12} fontWeight="900" color="$primary">
          {totalPods} pods
        </Text>
      </XStack>
    </XStack>
  );
}
