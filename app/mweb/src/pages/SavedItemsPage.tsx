import { gql, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';

const SAVED_ITEMS = gql`
  query SavedItems {
    mySavedPods {
      id
      pod_id
      club_slug
      pod_title
      pod_description
      pod_date_time
      zone_name
      pod_type
      pod_images_and_videos {
        url
        type
      }
    }
  }
`;

function formatDate(value?: string | null) {
  if (!value) return 'Date pending';
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export default function SavedItemsPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(SAVED_ITEMS, { fetchPolicy: 'cache-and-network' });
  const pods = data?.mySavedPods ?? [];

  if (loading && !data) {
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return (
    <Stack spacing={2} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <BookmarkIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Saved Items
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pods you saved from Explore.
          </Typography>
        </Box>
      </Stack>

      {!pods.length ? (
        <Alert severity="info">No saved items yet. Tap save in Explore to collect pods here.</Alert>
      ) : (
        <Stack spacing={1.5}>
          {pods.map((pod: any) => {
            const media = pod.pod_images_and_videos?.[0];
            return (
              <Card key={pod.id} variant="outlined">
                <CardActionArea
                  onClick={() =>
                    pod.club_slug && pod.pod_id
                      ? navigate(`/club/${pod.club_slug}/pod/${pod.pod_id}`)
                      : null
                  }
                >
                  <Stack direction="row" alignItems="stretch">
                    {media?.url ? (
                      <CardMedia
                        component={media.type === 'VIDEO' ? 'video' : 'img'}
                        image={media.type === 'VIDEO' ? undefined : media.url}
                        src={media.type === 'VIDEO' ? media.url : undefined}
                        sx={{ width: 116, minHeight: 132, objectFit: 'cover' }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 116,
                          minHeight: 132,
                          bgcolor: 'action.hover',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <EventIcon color="disabled" />
                      </Box>
                    )}
                    <CardContent sx={{ minWidth: 0, flex: 1 }}>
                      <Stack spacing={0.75}>
                        <Typography variant="subtitle1" fontWeight={800} noWrap>
                          {pod.pod_title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {pod.pod_description}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip icon={<EventIcon />} label={formatDate(pod.pod_date_time)} size="small" />
                          {pod.zone_name && <Chip icon={<PlaceIcon />} label={pod.zone_name} size="small" />}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Stack>
                </CardActionArea>
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
