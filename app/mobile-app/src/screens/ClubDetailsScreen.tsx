import { Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack, YStack } from 'tamagui';

import { Reveal } from '@/animations/Reveal';
import { useGoBack } from '@/hooks/useGoBack';
import { AppBackground } from '@/components/AppBackground';
import { ClubBody } from '@/components/details/ClubBody';
import { DetailHero, HeroButton } from '@/components/details/DetailHero';
import { DetailSkeleton } from '@/components/Skeleton';
import { useBottomInset } from '@/hooks/useBottomNavSpace';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useClubDetails, useResolvedClubId } from '@/hooks/useDetails';
import { useLocationMismatch } from '@/hooks/useLocationMismatch';
import { LocationMismatchDialog } from '@/components/LocationMismatchDialog';
import { useClubFollow } from '@/hooks/useFollow';
import { shareUrl } from '@/services/share-link';
import type { RootStackParamList } from '@/navigation/types';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { RefreshScrollView } from '@/components/PullToRefresh';

const DEEP_LINK_BASE = 'https://duncit.com/club';

/** Club details — opened from club cards/headers. Hero + summary + moments +
 * the club's upcoming pods. */
export function ClubDetailsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const goBack = useGoBack();
  const route = useRoute<RouteProp<RootStackParamList, 'ClubDetails'>>();
  // Doc id from in-app nav, or resolved from a shared /club/:clubSlug link.
  const { clubId, resolving } = useResolvedClubId(route.params);
  const { club, pods, members, followingUserIds, categoryCrumbs, isLoading, followingInitially } =
    useClubDetails(clubId);
  const {
    following,
    busy: followBusy,
    toggle: toggleFollow,
  } = useClubFollow(clubId, followingInitially);
  const { openPod } = useDetailNav();
  const locationPrompt = useLocationMismatch(
    club ? { id: club.location_id, zone: club.locality } : null,
  );
  // Nothing floats over this scroll (the follow CTA sits inline in the body), so
  // the last row only has to clear the Android navigation bar the edge-to-edge
  // window paints over the app — plus the page's own bottom breathing room.
  const bottomInset = useBottomInset();

  const handleShare = async () => {
    /* istanbul ignore next */
    if (!club) return;
    const url = await shareUrl('CLUB', club.club_id, `${DEEP_LINK_BASE}/${club.club_id}`);
    await Share.share({ title: club.club_name, message: `${club.club_name} — ${url}`, url });
  };

  const content = club ? (
    <RefreshScrollView flex={1} contentContainerStyle={{ paddingBottom: bottomInset + 16 }}>
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
          onOpenPod={(pod) => openPod(pod.club_slug, pod.pod_id)}
          onOpenMember={(userId) => navigation.navigate('PublicProfile', { userId })}
          onOpenVenue={(venueId) => navigation.navigate('VenueDetails', { venueId })}
        />
      </Reveal>
    </RefreshScrollView>
  ) : (
    <YStack flex={1} alignItems="center" justifyContent="center" gap={12} padding={24}>
      <Text color="$muted" testID="club-details-error">
        This club is unavailable.
      </Text>
      <XStack
        pressStyle={PRESS_STYLE.surface}
        role="button"
        aria-label={t('mweb.common.goBack')}
        onPress={goBack}
      >
        <Text color="$primary" fontWeight="700">
          Go back
        </Text>
      </XStack>
    </YStack>
  );

  // A shared link is still being resolved to a club — hold the skeleton, as
  // PodDetailsScreen does, instead of reading "This club is unavailable." for the
  // whole lookup.
  const showSkeleton = resolving || (isLoading && !club);

  return (
    <YStack flex={1} testID="club-details-screen">
      <AppBackground />
      {/* Top safe-area: page content must never overlap the device's
          notification/status bar (matches the StackScreen scaffold). */}
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {showSkeleton ? <DetailSkeleton testID="club-details-loading" /> : content}
      </SafeAreaView>
      <LocationMismatchDialog kind="CLUB" {...locationPrompt} />
    </YStack>
  );
}
