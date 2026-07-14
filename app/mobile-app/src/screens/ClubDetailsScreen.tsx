import { Share } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { Reveal } from '@/animations/Reveal';
import { useGoBack } from '@/hooks/useGoBack';
import { AppBackground } from '@/components/AppBackground';
import { ClubBody } from '@/components/details/ClubBody';
import { DetailHero, HeroButton } from '@/components/details/DetailHero';
import { DetailSkeleton } from '@/components/Skeleton';
import { useClubDetails } from '@/hooks/useDetails';
import { useClubFollow } from '@/hooks/useFollow';
import type { RootStackParamList } from '@/navigation/types';

const DEEP_LINK_BASE = 'https://duncit.com/club';

/** Club details — opened from club cards/headers. Hero + summary + moments +
 * the club's upcoming pods. */
export function ClubDetailsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const goBack = useGoBack();
  const route = useRoute<RouteProp<RootStackParamList, 'ClubDetails'>>();
  const { clubId } = route.params;
  const { club, pods, members, followingUserIds, categoryCrumbs, isLoading, followingInitially } =
    useClubDetails(clubId);
  const {
    following,
    busy: followBusy,
    toggle: toggleFollow,
  } = useClubFollow(clubId, followingInitially);

  const handleShare = async () => {
    /* istanbul ignore next */
    if (!club) return;
    const url = `${DEEP_LINK_BASE}/${club.club_id}`;
    await Share.share({ title: club.club_name, message: `${club.club_name} — ${url}`, url });
  };

  const content = club ? (
    <ScrollView flex={1} contentContainerStyle={{ paddingBottom: 110 }}>
      <DetailHero media={club.club_feature_images_and_videos} onBack={goBack}>
        <HeroButton testID="hb-share" icon="share" onPress={handleShare} />
      </DetailHero>
      <Reveal>
        <ClubBody
          club={club}
          pods={pods}
          members={members}
          followingUserIds={followingUserIds}
          categoryCrumbs={categoryCrumbs}
          following={following}
          followBusy={followBusy}
          onToggleFollow={() => void toggleFollow()}
          onOpenPod={(pod) =>
            navigation.navigate('PodDetails', { podId: pod.id, title: pod.pod_title })
          }
          onOpenMember={(userId) => navigation.navigate('PublicProfile', { userId })}
          onOpenVenue={(venueId) => navigation.navigate('VenueDetails', { venueId })}
        />
      </Reveal>
    </ScrollView>
  ) : (
    <YStack flex={1} alignItems="center" justifyContent="center" gap={12} padding={24}>
      <Text color="$muted" testID="club-details-error">
        This club is unavailable.
      </Text>
      <XStack role="button" aria-label="Go back" onPress={goBack}>
        <Text color="$primary" fontWeight="900">
          Go back
        </Text>
      </XStack>
    </YStack>
  );

  return (
    <YStack flex={1} testID="club-details-screen">
      <AppBackground />
      {isLoading && !club ? <DetailSkeleton testID="club-details-loading" /> : content}
    </YStack>
  );
}
