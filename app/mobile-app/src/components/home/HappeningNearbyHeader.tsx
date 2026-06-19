import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, XStack, YStack } from 'tamagui';

interface HappeningNearbyHeaderProps {
  totalPods: number;
  /** Opens the dedicated Happening Nearby page (title or See all tap). */
  onPress?: () => void;
  /** Opens the filter sheet (bug 6) — when omitted the filter button is hidden. */
  onOpenFilter?: () => void;
  /** Count of active filters — shows a badge on the filter button. */
  filterCount?: number;
}

/** "Happening nearby" section header with the gradient flame badge and a live
 * pod count — tapping it opens the live nearby-pods view. A "See all" pill and a
 * filter button (bug 6) sit on the right, mirroring mWeb's home header. */
export function HappeningNearbyHeader({
  totalPods,
  onPress,
  onOpenFilter,
  filterCount = 0,
}: Readonly<HappeningNearbyHeaderProps>) {
  return (
    <XStack
      testID="happening-nearby-header"
      alignItems="center"
      justifyContent="space-between"
      gap={10}
      paddingHorizontal={16}
    >
      <XStack
        role="button"
        aria-label="Happening nearby"
        onPress={onPress}
        alignItems="center"
        gap={10}
        flex={1}
        pressStyle={{ opacity: 0.85 }}
      >
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
      <XStack alignItems="center" gap={8}>
        <XStack
          testID="happening-nearby-see-all"
          role="button"
          aria-label="See all live pods"
          onPress={onPress}
          alignItems="center"
          gap={4}
          borderRadius={999}
          borderWidth={1.5}
          borderColor="$primary"
          paddingHorizontal={12}
          paddingVertical={6}
          pressStyle={{ opacity: 0.8 }}
        >
          <Text fontSize={12} fontWeight="900" color="$primary">
            See all · {totalPods} pods
          </Text>
          <MaterialIcons name="chevron-right" size={16} color="#ff4f73" />
        </XStack>
        {onOpenFilter ? (
          <XStack
            testID="happening-nearby-filter"
            role="button"
            aria-label={filterCount > 0 ? `Open filters (${filterCount} active)` : 'Open filters'}
            onPress={onOpenFilter}
            alignItems="center"
            justifyContent="center"
            width={38}
            height={38}
            borderRadius={999}
            borderWidth={1.5}
            borderColor="$borderColor"
            backgroundColor="$surface"
            pressStyle={{ opacity: 0.8 }}
          >
            <MaterialIcons name="tune" size={18} color="#ff4f73" />
            {filterCount > 0 ? (
              <XStack
                testID="happening-nearby-filter-badge"
                position="absolute"
                top={-4}
                right={-4}
                minWidth={16}
                height={16}
                borderRadius={999}
                paddingHorizontal={4}
                alignItems="center"
                justifyContent="center"
                backgroundColor="$primary"
              >
                <Text fontSize={9} fontWeight="900" color="$onPrimary">
                  {filterCount}
                </Text>
              </XStack>
            ) : null}
          </XStack>
        ) : null}
      </XStack>
    </XStack>
  );
}
