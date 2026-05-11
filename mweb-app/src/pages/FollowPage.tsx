import { useMemo, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
  Button,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { Link as RouterLink } from 'react-router-dom';
import { useFollowedClubs } from '../hooks/useFollowedClubs';
import MomentTile from '../components/moments/MomentTile';
import MomentLightbox from '../components/moments/MomentLightbox';

const FOLLOW_FEED = gql`
  query FollowFeedClubs {
    superCategories: categories(filter: { level: SUPER }) {
      id
      slug
    }
    clubs {
      id
      club_id
      club_name
      super_category_id
      club_moments {
        url
        type
      }
    }
  }
`;

interface ClubLite {
  id: string;
  club_id?: string;
  club_name: string;
  super_category_id?: string | null;
  club_moments: { url: string; type: string }[];
}

export default function FollowPage({ superCategorySlug }: { superCategorySlug?: string }) {
  const { ids, isFollowing } = useFollowedClubs();
  const { data, loading, error } = useQuery<{ clubs: ClubLite[] }>(FOLLOW_FEED, {
    fetchPolicy: 'cache-and-network',
  });
  const [lightbox, setLightbox] = useState<{ clubId: string; index: number } | null>(null);

  const followed = useMemo(() => {
    const selectedSuperId = superCategorySlug
      ? (data as any)?.superCategories?.find((category: any) => category.slug === superCategorySlug)?.id
      : null;
    return (data?.clubs ?? [])
      .filter((club) => isFollowing(club.id))
      .filter((club) => !selectedSuperId || club.super_category_id === selectedSuperId);
  }, [data, isFollowing, superCategorySlug]);

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

  if (ids.length === 0) {
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
    <Stack spacing={2} sx={{ p: 2 }}>
      <Typography variant="h5" fontWeight={700}>
        Following
      </Typography>
      {followed.map((club) => (
        <Card key={club.id} variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1 }}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                {club.club_name}
              </Typography>
              <Button
                size="small"
                component={RouterLink}
                to={club.club_id ? `/club/${club.club_id}` : '#'}
              >
                Open club
              </Button>
            </Stack>
            {club.club_moments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No moments shared yet.
              </Typography>
            ) : (
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  overflowX: 'auto',
                  pb: 0.5,
                  '&::-webkit-scrollbar': { display: 'none' },
                }}
              >
                {club.club_moments.slice(0, 12).map((m, i) => (
                  <Box key={i} sx={{ width: 110, height: 110, flex: '0 0 auto' }}>
                    <MomentTile
                      url={m.url}
                      type={m.type as any}
                      size={110}
                      index={i}
                      total={club.club_moments.length}
                      onClick={() => setLightbox({ clubId: club.id, index: i })}
                    />
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      ))}
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
