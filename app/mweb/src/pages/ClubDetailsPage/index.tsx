import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { useFollowedClubs } from '../../hooks/useFollowedClubs';
import { notify } from '../../components/notify';
import { usePricing } from '../../hooks/usePricing';
import ClubHero from '../club-details-page/ClubHero';
import ClubDetailsSkeleton from '../club-details-page/ClubDetailsSkeleton';
import ClubMeetupVenuesSection from '../club-details-page/ClubMeetupVenuesSection';
import ClubSocialLinks from '../club-details-page/ClubSocialLinks';
import ClubSummaryHeader from '../club-details-page/ClubSummaryHeader';
import ClubMembersSection from '../club-details-page/ClubMembersSection';
import ClubStoriesSection from '../club-details-page/ClubStoriesSection';
import ClubSegments from '../club-details-page/ClubSegments';
import ClubFriendsSection from '../club-details-page/ClubFriendsSection';
import ClubRatingSection from '../club-details-page/ClubRatingSection';
import {
  CLUB_BY_SLUG,
  CLUB_DETAILS_RELATED,
  CLUB_CATEGORY_NAMES,
} from './clubDetailsQueries';
import useSavedClub from './useSavedClub';

export default function ClubDetailsPage() {
  const { clubSlug = '' } = useParams();
  const navigate = useNavigate();
  const { format: pricingFormat } = usePricing();
  const { isFollowing, toggle: toggleFollow } = useFollowedClubs();

  const slugQuery = useQuery(CLUB_BY_SLUG, {
    variables: { slug: clubSlug },
    skip: !clubSlug,
    fetchPolicy: 'cache-and-network',
  });
  const club = slugQuery.data?.clubBySlug;
  const clubId: string = club?.id ?? '';
  const { saved, saving: savingClub, toggleSaved } = useSavedClub(clubId);

  const { data, loading, error } = useQuery(CLUB_DETAILS_RELATED, {
    variables: { id: clubId },
    skip: !clubId,
    fetchPolicy: 'cache-and-network',
  });

  const catId = club?.category_id ?? '';
  const superCatId = club?.super_category_id ?? '';
  const { data: catData } = useQuery(CLUB_CATEGORY_NAMES, {
    variables: { catId, superCatId },
    skip: !catId && !superCatId,
    fetchPolicy: 'cache-first',
  });

  if (slugQuery.loading || (loading && !data)) return <ClubDetailsSkeleton />;
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!club) return <Alert severity="warning">Club not found.</Alert>;

  const featureMedia = club.club_feature_images_and_videos ?? [];
  const pods = data?.clubPods ?? [];
  const venues = club.matched_venues ?? [];

  const memberIds = Array.from(
    new Set<string>(pods.flatMap((podItem: any) => podItem.pod_attendees ?? []))
  );

  const followingUserIds: string[] = data?.me?.following_user_ids ?? [];
  const friendIds = memberIds.filter((id) => followingUserIds.includes(id));

  const categoryName = catData?.clubCategory?.name ?? '';
  const superCategoryName = catData?.clubSuperCategory?.name ?? '';

  const openPod = (podDocId: string) => {
    const pod = pods.find((podItem: any) => podItem.id === podDocId);
    if (pod?.pod_id && club.club_id) navigate(`/club/${club.club_id}/pod/${pod.pod_id}`);
  };

  const toggleClubFollow = async () => {
    try {
      const nextFollowing = await toggleFollow(club.id);
      notify(nextFollowing ? `Following ${club.club_name}` : `Unfollowed ${club.club_name}`, 'success');
    } catch (toggleError: any) {
      notify(toggleError?.message ?? 'Could not update club follow', 'error');
    }
  };

  const shareClub = async () => {
    const url = `${window.location.origin}/club/${club.club_id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: club.club_name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      notify('Link copied', 'success');
    } catch {
      /* user cancelled */
    }
  };

  return (
    <Stack
      spacing={2.25}
      sx={{
        mx: { xs: -1.25, sm: -2 },
        px: { xs: 1.25, sm: 2 },
        pt: 0,
        pb: 'calc(var(--duncit-bottom-nav-height, 72px) + env(safe-area-inset-bottom) + 10px)',
        minHeight: '100%',
      }}
    >
      <ClubHero
        media={featureMedia}
        title={club.club_name}
        saved={saved}
        saveLoading={savingClub}
        following={isFollowing(club.id)}
        onBack={() => navigate(-1)}
        onToggleFollow={toggleClubFollow}
        onToggleSave={toggleSaved}
        onShare={shareClub}
      />
      <ClubSummaryHeader
        club={club}
        featureUrl={featureMedia[0]?.url}
        podCount={pods.length}
        venueCount={venues.length}
        followersCount={club.followers_count ?? 0}
        membersCount={memberIds.length}
        categoryName={categoryName}
        superCategoryName={superCategoryName}
        following={isFollowing(club.id)}
        chatUrl={club.club_whats_app_group_link || club.club_whats_app_community_link}
        onToggleFollow={toggleClubFollow}
      />
      <ClubStoriesSection clubId={club.id} />
      <ClubSocialLinks club={club} />
      {club.club_description && (
        <Box>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            About
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
            {club.club_description}
          </Typography>
        </Box>
      )}
      <ClubMembersSection memberIds={memberIds} />
      <ClubFriendsSection friendIds={friendIds} />
      <ClubRatingSection
        clubId={club.id}
        rating={club.rating ?? 0}
        ratingsCount={club.ratings_count ?? 0}
      />
      <ClubMeetupVenuesSection venues={venues} />
      <ClubSegments club={club} pods={pods} priceFormat={pricingFormat} onOpenPod={openPod} />
    </Stack>
  );
}
