import { gql, useQuery } from '@apollo/client';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useFollowedClubs } from '../hooks/useFollowedClubs';
import { notify } from '../components/notify';
import { usePricing } from '../hooks/usePricing';
import ClubHero from './club-details-page/ClubHero';
import ClubDetailsSkeleton from './club-details-page/ClubDetailsSkeleton';
import ClubMeetupVenuesSection from './club-details-page/ClubMeetupVenuesSection';
import ClubMomentsSection from './club-details-page/ClubMomentsSection';
import ClubSocialLinks from './club-details-page/ClubSocialLinks';
import ClubSummaryHeader from './club-details-page/ClubSummaryHeader';
import ClubUpcomingPodsSection from './club-details-page/ClubUpcomingPodsSection';

const CLUB_BY_SLUG = gql`
  query ClubBySlug($slug: String!) {
    clubBySlug(club_slug: $slug) {
      id
      club_id
      club_name
      club_description
      club_feature_images_and_videos {
        url
        type
      }
      club_moments {
        url
        type
      }
      club_whats_app_community_link
      club_whats_app_announcement_link
      club_whats_app_group_link
      meetup_venues_id
      category_id
      super_category_id
    }
  }
`;

const CLUB_DETAILS_RELATED = gql`
  query ClubDetailsRelated($id: ID!) {
    clubPods: pods(filter: { club_id: $id, is_active: true }) {
      id
      pod_id
      pod_title
      pod_date_time
      pod_type
      pod_amount
      pod_attendees
      no_of_spots
      place_label
      place_detail
      club_slug
      pod_images_and_videos {
        url
        type
      }
    }
    publicVenues {
      id
      venue_name
      address_line1
      address_line2
      locality
      city
      state
      country
      postal_code
      lat
      lng
    }
  }
`;

export default function ClubDetailsPage() {
  const { clubSlug = '' } = useParams();
  const navigate = useNavigate();
  const { format: pricingFormat } = usePricing();
  const { isFollowing, toggle: toggleFollow } = useFollowedClubs();
  const [saved, setSaved] = useState(false);

  const slugQuery = useQuery(CLUB_BY_SLUG, {
    variables: { slug: clubSlug },
    skip: !clubSlug,
    fetchPolicy: 'cache-and-network',
  });
  const id: string = slugQuery.data?.clubBySlug?.id ?? '';

  const { data, loading, error } = useQuery(CLUB_DETAILS_RELATED, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    if (!id) return;
    try {
      const list: string[] = JSON.parse(
        localStorage.getItem('duncit_saved_clubs') || '[]'
      );
      setSaved(list.includes(id));
    } catch {
      /* ignore */
    }
  }, [id]);

  if (slugQuery.loading || (loading && !data)) return <ClubDetailsSkeleton />;
  if (error) return <Alert severity="error">{error.message}</Alert>;

  const club = slugQuery.data?.clubBySlug;
  if (!club) return <Alert severity="warning">Club not found.</Alert>;

  const featureMedia = club.club_feature_images_and_videos ?? [];
  const moments = club.club_moments ?? [];
  const pods = data?.clubPods ?? [];
  const venueIds: string[] = club.meetup_venues_id ?? [];
  const venues = (data?.publicVenues ?? []).filter((venue: any) => venueIds.includes(venue.id));

  return (
    <Stack spacing={3} sx={{ pt: 0, pb: 6 }}>
      <ClubHero
        media={featureMedia}
        title={club.club_name}
        saved={saved}
        following={isFollowing(club.id)}
        onBack={() => navigate(-1)}
        onToggleFollow={() => {
          toggleFollow(club.id);
          notify(
            isFollowing(club.id)
              ? `Unfollowed ${club.club_name}`
              : `Following ${club.club_name}`,
            'success'
          );
        }}
        onToggleSave={() => {
          const next = !saved;
          setSaved(next);
          const key = 'duncit_saved_clubs';
          const list: string[] = JSON.parse(localStorage.getItem(key) || '[]');
          const updated = next
            ? Array.from(new Set([...list, club.id]))
            : list.filter((x) => x !== club.id);
          localStorage.setItem(key, JSON.stringify(updated));
          notify(next ? 'Saved' : 'Removed from saved', 'success');
        }}
        onShare={async () => {
          const url = `${window.location.origin}/club/${club.club_id}`;
          try {
            if (navigator.share) {
              await navigator.share({ title: club.club_name, url });
            } else {
              await navigator.clipboard.writeText(url);
              notify('Link copied', 'success');
            }
          } catch {
            /* user cancelled */
          }
        }}
      />

      <ClubSummaryHeader
        club={club}
        featureUrl={featureMedia[0]?.url}
        podCount={pods.length}
        venueCount={venues.length}
      />

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
          const pod = pods.find((p: any) => p.id === podDocId);
          if (pod?.pod_id && club.club_id) {
            navigate(`/club/${club.club_id}/pod/${pod.pod_id}`);
          }
        }}
      />

      <ClubMomentsSection moments={moments} />
    </Stack>
  );
}
