import { useMemo, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { Link as RouterLink } from 'react-router-dom';
import { useFollowedClubs } from '../hooks/useFollowedClubs';
import MomentLightbox from '../components/moments/MomentLightbox';
import FollowClubCard from './follow-page/FollowClubCard';
import FollowPersonCard from './follow-page/FollowPersonCard';

const FOLLOW_FEED = gql`
  query FollowFeedClubs {
    me {
      user_id
      following_user_ids
    }
    superCategories: categories(filter: { level: SUPER }) {
      id
      slug
    }
    clubs {
      id
      club_id
      club_name
      club_description
      super_category_id
      club_feature_images_and_videos {
        url
        type
      }
      club_moments {
        url
        type
      }
    }
    publicHosts {
      id
      user_id
      full_name
      email
      passport_photo_url
      full_address
      tags
    }
  }
`;

const FOLLOWED_USERS = gql`
  query FollowedPeople($userIds: [ID!]!) {
    publicUsersByIds(user_ids: $userIds) {
      user_id
      full_name
      first_name
      profile_photo
    }
  }
`;

type FollowTab = 'CLUBS' | 'HOSTS' | 'FRIENDS';

interface ClubLite {
  id: string;
  club_id?: string;
  club_name: string;
  super_category_id?: string | null;
  club_feature_images_and_videos?: { url: string; type: string }[];
  club_moments: { url: string; type: string }[];
}

export default function FollowPage({ superCategorySlug }: { superCategorySlug?: string }) {
  const { ids, isFollowing } = useFollowedClubs();
  const { data, loading, error } = useQuery<{ clubs: ClubLite[] }>(FOLLOW_FEED, {
    fetchPolicy: 'cache-and-network',
  });
  const [lightbox, setLightbox] = useState<{ clubId: string; index: number } | null>(null);
  const [tab, setTab] = useState<FollowTab>('CLUBS');
  const followingUserIds: string[] = (data as any)?.me?.following_user_ids ?? [];
  const usersQuery = useQuery(FOLLOWED_USERS, {
    variables: { userIds: followingUserIds },
    skip: followingUserIds.length === 0,
    fetchPolicy: 'cache-and-network',
  });

  const followed = useMemo(() => {
    const selectedSuperId = superCategorySlug
      ? (data as any)?.superCategories?.find((category: any) => category.slug === superCategorySlug)?.id
      : null;
    return (data?.clubs ?? [])
      .filter((club) => isFollowing(club.id))
      .filter((club) => !selectedSuperId || club.super_category_id === selectedSuperId);
  }, [data, isFollowing, superCategorySlug]);

  const followedHosts = useMemo(() => {
    const userIds = new Set(followingUserIds);
    return ((data as any)?.publicHosts ?? []).filter((host: any) => userIds.has(host.user_id));
  }, [data, followingUserIds]);
  const friends = usersQuery.data?.publicUsersByIds ?? [];
  const totalMoments = followed.reduce((total, club) => total + (club.club_moments?.length ?? 0), 0);
  const tabs: Array<[FollowTab, string, number]> = [['CLUBS', 'Clubs', followed.length], ['HOSTS', 'Hosts', followedHosts.length], ['FRIENDS', 'Friends', friends.length]];

  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  if (ids.length === 0 && followingUserIds.length === 0) {
    return (
      <Stack spacing={2} alignItems="center" sx={{ py: 6, textAlign: 'center' }}>
        <FavoriteIcon sx={{ fontSize: 56, color: 'text.disabled' }} />
        <Typography variant="h6" fontWeight={700}>
          No follows yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Follow clubs to see their moments and pod highlights here.
        </Typography>
        <Button component={RouterLink} to="/clubs" variant="contained">
          Browse clubs
        </Button>
      </Stack>
    );
  }

  return (
    <Stack
      spacing={2}
      sx={{
        mx: { xs: -1.25, sm: -2 },
        px: { xs: 1.25, sm: 2 },
        py: 1.5,
        minHeight: '100%',
      }}
    >
      <Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1 }}>
            Following
          </Typography>
          <Chip size="small" label={`${totalMoments} moments`} color="error" sx={{ height: 22, fontWeight: 900 }} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4, fontWeight: 700 }}>
          Latest from your clubs and hosts
        </Typography>
      </Box>
      <Stack direction="row" spacing={0.75} sx={{ overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
        {tabs.map(([value, label, count]) => (
          <Chip key={value} clickable color={tab === value ? 'primary' : 'default'} variant={tab === value ? 'filled' : 'outlined'} label={`${label} ${count}`} onClick={() => setTab(value)} sx={{ height: 34, fontWeight: 900 }} />
        ))}
      </Stack>
      {tab === 'CLUBS' && followed.map((club) => (
        <FollowClubCard key={club.id} club={club} onOpenMoment={(index) => setLightbox({ clubId: club.id, index })} />
      ))}
      {tab === 'HOSTS' && followedHosts.map((host: any) => <FollowPersonCard key={host.id} person={host} kind="HOST" />)}
      {tab === 'FRIENDS' && friends.map((friend: any) => <FollowPersonCard key={friend.user_id} person={friend} kind="FRIEND" />)}
      {tabs.find(([value]) => value === tab)?.[2] === 0 && (
        <Box sx={{ p: 3, borderRadius: 4, bgcolor: 'action.hover', textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Nothing here yet. Follow more people and clubs to fill this feed.
          </Typography>
        </Box>
      )}
      <MomentLightbox
        moments={
          (followed.find((c) => c.id === lightbox?.clubId)?.club_moments ?? []) as any
        }
        index={lightbox?.index ?? null}
        onClose={() => setLightbox(null)}
        onIndexChange={(idx) =>
          setLightbox((prev) => (prev ? { ...prev, index: idx } : prev))
        }
      />
    </Stack>
  );
}
