import { Share } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { DetailHero, HeroButton } from '@/components/details/DetailHero';
import { PodAccordions } from '@/components/details/PodAccordions';
import { PodInfo } from '@/components/details/PodInfo';
import { DetailSkeleton } from '@/components/Skeleton';
import { usePodActions, usePodDetails } from '@/hooks/useDetails';
import type { RootStackParamList } from '@/navigation/types';

/** Pod details — hero gallery + overview + the full accordion stack. Opened from
 * the reels and pod cards. */
export function PodDetailsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'PodDetails'>>();
  const { podId } = route.params;
  const { pod, savedInitially, isLoading } = usePodDetails(podId);
  const { liked, saved, toggleLike, toggleSave } = usePodActions(pod, savedInitially);

  const share = async () => {
    if (!pod) return;
    try {
      await Share.share({ message: `${pod.pod_title} — join on Duncit`, title: pod.pod_title });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <YStack flex={1} testID="pod-details-screen">
      <AppBackground />
      {isLoading && !pod ? (
        <DetailSkeleton testID="pod-details-loading" />
      ) : !pod ? (
        <YStack flex={1} alignItems="center" justifyContent="center" gap={12} padding={24}>
          <Text color="$muted" testID="pod-details-error">
            This pod is unavailable.
          </Text>
          <XStack role="button" aria-label="Go back" onPress={() => navigation.goBack()}>
            <Text color="$primary" fontWeight="900">
              Go back
            </Text>
          </XStack>
        </YStack>
      ) : (
        <ScrollView flex={1} contentContainerStyle={{ paddingBottom: 110 }}>
          <DetailHero media={pod.pod_images_and_videos} onBack={() => navigation.goBack()}>
            <HeroButton
              testID="pod-like"
              icon={liked ? 'favorite' : 'favorite-border'}
              active={liked}
              onPress={toggleLike}
            />
            <HeroButton
              testID="pod-save"
              icon={saved ? 'bookmark' : 'bookmark-border'}
              active={saved}
              onPress={toggleSave}
            />
            <HeroButton testID="pod-share" icon="share" onPress={share} />
          </DetailHero>
          <PodInfo pod={pod} />
          <PodAccordions
            pod={pod}
            onOpenClub={() =>
              navigation.navigate('ClubDetails', { clubId: pod.club_id, title: 'Club' })
            }
          />
        </ScrollView>
      )}
    </YStack>
  );
}
