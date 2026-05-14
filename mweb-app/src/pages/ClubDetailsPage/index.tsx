import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Divider, Stack, Typography } from '@mui/material';
import { useFollowedClubs } from '../../hooks/useFollowedClubs';
import { notify } from '../../components/notify';
import { usePricing } from '../../hooks/usePricing';
import ClubHero from '../club-details-page/ClubHero';
import ClubDetailsSkeleton from '../club-details-page/ClubDetailsSkeleton';
import ClubMeetupVenuesSection from '../club-details-page/ClubMeetupVenuesSection';
import ClubMomentsSection from '../club-details-page/ClubMomentsSection';
import ClubSocialLinks from '../club-details-page/ClubSocialLinks';
import ClubSummaryHeader from '../club-details-page/ClubSummaryHeader';
import ClubUpcomingPodsSection from '../club-details-page/ClubUpcomingPodsSection';
import { CLUB_BY_SLUG, CLUB_DETAILS_RELATED } from './clubDetailsQueries';
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
  const { saved, toggleSaved } = useSavedClub(clubId);
  const { data, loading, error } = useQuery(CLUB_DETAILS_RELATED, {
    variables: { id: clubId },
    skip: !clubId,
    fetchPolicy: 'cache-and-network',
  });

  if (slugQuery.loading || (loading && !data)) return <ClubDetailsSkeleton />;
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!club) return <Alert severity="warning">Club not found.</Alert>;

  const featureMedia = club.club_feature_images_and_videos ?? [];
  const moments = club.club_moments ?? [];
  const pods = data?.clubPods ?? [];
  const venueIds: string[] = club.meetup_venues_id ?? [];
  const venues = (data?.publicVenues ?? []).filter((venue: any) => venueIds.includes(venue.id));

  const toggleClubFollow = () => {
    toggleFollow(club.id);
    notify(isFollowing(club.id) ? `Unfollowed ${club.club_name}` : `Following ${club.club_name}`, 'success');
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
    <Stack spacing={3} sx={{ pt: 0, pb: 6 }}>
      <ClubHero
        media={featureMedia}
        title={club.club_name}
        saved={saved}
        following={isFollowing(club.id)}
        onBack={() => navigate(-1)}
        onToggleFollow={toggleClubFollow}
        onToggleSave={toggleSaved}
        onShare={shareClub}
      />
      <ClubSummaryHeader club={club} featureUrl={featureMedia[0]?.url} podCount={pods.length} venueCount={venues.length} />
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
      <ClubMeetupVenuesSection venues={venues} />
      <Divider />
      <ClubUpcomingPodsSection
        pods={pods}
        priceFormat={pricingFormat}
        onOpen={(podDocId) => {
          const pod = pods.find((podItem: any) => podItem.id === podDocId);
          if (pod?.pod_id && club.club_id) navigate(`/club/${club.club_id}/pod/${pod.pod_id}`);
        }}
      />
      <ClubMomentsSection moments={moments} />
    </Stack>
  );
}