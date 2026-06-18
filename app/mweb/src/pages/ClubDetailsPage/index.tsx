import { useQuery } from '@apollo/client';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import { useFollowedClubs } from '../../hooks/useFollowedClubs';
import { notify } from '../../components/notify';
import { usePricing } from '../../hooks/usePricing';
import ClubHero from '../club-details-page/ClubHero';
import ClubDetailsSkeleton from '../club-details-page/ClubDetailsSkeleton';
import ClubMeetupVenuesSection from '../club-details-page/ClubMeetupVenuesSection';
import ClubMomentsSection from '../club-details-page/ClubMomentsSection';
import ClubSocialLinks from '../club-details-page/ClubSocialLinks';
import ClubSummaryHeader from '../club-details-page/ClubSummaryHeader';
import ClubMembersSection from '../club-details-page/ClubMembersSection';
import ClubHostsSection from '../club-details-page/ClubHostsSection';
import ClubStoriesSection from '../club-details-page/ClubStoriesSection';
import ClubUpcomingPodsSection from '../club-details-page/ClubUpcomingPodsSection';
import { podStatus } from '../../utils/podStatus';
import { CLUB_BY_SLUG, CLUB_DETAILS_RELATED } from './clubDetailsQueries';
import useSavedClub from './useSavedClub';

type ClubTab = 'LIVE' | 'UPCOMING' | 'PREVIOUS' | 'MOMENTS' | 'VENUES';

export default function ClubDetailsPage() {
  const { clubSlug = '' } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<ClubTab>('UPCOMING');
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

  if (slugQuery.loading || (loading && !data)) return <ClubDetailsSkeleton />;
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!club) return <Alert severity="warning">Club not found.</Alert>;

  const featureMedia = club.club_feature_images_and_videos ?? [];
  const moments = club.club_moments ?? [];
  const pods = data?.clubPods ?? [];
  const podsByPhase = (phase: 'LIVE' | 'UPCOMING' | 'ENDED') =>
    pods.filter((podItem: any) => podStatus(podItem.pod_date_time, podItem.pod_end_date_time) === phase);
  const livePods = podsByPhase('LIVE');
  const upcomingPods = podsByPhase('UPCOMING');
  const previousPods = podsByPhase('ENDED');
  const venueIds: string[] = club.meetup_venues_id ?? [];
  const venues = (data?.publicVenues ?? []).filter((venue: any) => venueIds.includes(venue.id));
  const clubTabs: ReadonlyArray<readonly [ClubTab, string]> = [
    ['LIVE', `Live ${livePods.length}`],
    ['UPCOMING', `Upcoming ${upcomingPods.length}`],
    ['PREVIOUS', `Previous ${previousPods.length}`],
    ['MOMENTS', `Moments ${moments.length}`],
    ['VENUES', `Venues ${venues.length}`],
  ];

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
        following={isFollowing(club.id)}
        chatUrl={club.club_whats_app_group_link || club.club_whats_app_community_link}
        onToggleFollow={toggleClubFollow}
      />
      <ClubStoriesSection clubId={club.id} />
      <ClubSocialLinks club={club} />
      <ClubHostsSection hosts={club.hosts ?? []} />
      <ClubMembersSection
        memberIds={Array.from(
          new Set(pods.flatMap((podItem: any) => podItem.pod_attendees ?? []))
        )}
      />
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
      <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
        {clubTabs.map(([value, label]) => (
          <Chip key={value} label={label} clickable color={tab === value ? 'primary' : 'default'} variant={tab === value ? 'filled' : 'outlined'} onClick={() => setTab(value)} sx={{ height: 34, fontWeight: 900 }} />
        ))}
      </Stack>
      {tab === 'LIVE' && (
        <ClubUpcomingPodsSection
          pods={livePods}
          priceFormat={pricingFormat}
          onOpen={openPod}
          title="Live now"
          emptyText="No pods are live right now."
        />
      )}
      {tab === 'UPCOMING' && (
        <ClubUpcomingPodsSection pods={upcomingPods} priceFormat={pricingFormat} onOpen={openPod} />
      )}
      {tab === 'PREVIOUS' && (
        <ClubUpcomingPodsSection
          pods={previousPods}
          priceFormat={pricingFormat}
          onOpen={openPod}
          title="Previous pods"
          emptyText="No past pods yet."
        />
      )}
      {tab === 'MOMENTS' && <ClubMomentsSection moments={moments} />}
      {tab === 'VENUES' && <ClubMeetupVenuesSection venues={venues} />}
    </Stack>
  );
}