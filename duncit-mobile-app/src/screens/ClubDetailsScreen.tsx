import { useWindowDimensions } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { ClubBody } from '@/components/details/ClubBody';
import { DetailHero } from '@/components/details/DetailHero';
import { DetailSkeleton } from '@/components/Skeleton';
import { useClubDetails } from '@/hooks/useDetails';
import type { RootStackParamList } from '@/navigation/types';

/** Club details — opened from club cards/headers. Hero + summary + moments +
 * the club's upcoming pods. */
export function ClubDetailsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ClubDetails'>>();
  const { width } = useWindowDimensions();
  const { clubId } = route.params;
  const { club, pods, isLoading } = useClubDetails(clubId);
  const cardWidth = Math.min(width - 32, 520);

  return (
    <YStack flex={1} testID="club-details-screen">
      <AppBackground />
      {isLoading && !club ? (
        <DetailSkeleton testID="club-details-loading" />
      ) : !club ? (
        <YStack flex={1} alignItems="center" justifyContent="center" gap={12} padding={24}>
          <Text color="$muted" testID="club-details-error">
            This club is unavailable.
          </Text>
          <XStack role="button" aria-label="Go back" onPress={() => navigation.goBack()}>
            <Text color="$primary" fontWeight="900">
              Go back
            </Text>
          </XStack>
        </YStack>
      ) : (
        <ScrollView flex={1} contentContainerStyle={{ paddingBottom: 110 }}>
          <DetailHero
            media={club.club_feature_images_and_videos}
            onBack={() => navigation.goBack()}
          />
          <ClubBody
            club={club}
            pods={pods}
            cardWidth={cardWidth}
            onOpenPod={(pod) =>
              navigation.navigate('PodDetails', { podId: pod.id, title: pod.pod_title })
            }
          />
        </ScrollView>
      )}
    </YStack>
  );
}
