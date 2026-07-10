import { Box, Card, CardActionArea, CardContent, CardMedia, Chip, Stack, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import SellIcon from '@mui/icons-material/Sell';
import type { SavedPod } from './queries';

function formatDate(value?: string | null) {
  if (!value) return 'Date pending';
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

interface Props {
  pod: SavedPod;
  onOpen: (pod: SavedPod) => void;
}

export default function SavedItemCard({ pod, onOpen }: Readonly<Props>) {
  const media = pod.pod_images_and_videos?.[0];
  return (
    <Card variant="outlined">
      <CardActionArea onClick={() => onOpen(pod)}>
        <Stack direction="row" alignItems="stretch">
          {media?.url ? (
            <CardMedia
              component={media.type === 'VIDEO' ? 'video' : 'img'}
              image={media.type === 'VIDEO' ? undefined : media.url}
              src={media.type === 'VIDEO' ? media.url : undefined}
              sx={{ width: 116, minHeight: 132, objectFit: 'cover' }}
            />
          ) : (
            <Box sx={{ width: 116, minHeight: 132, bgcolor: 'action.hover', display: 'grid', placeItems: 'center' }}>
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
                {pod.zone_name ? <Chip icon={<PlaceIcon />} label={pod.zone_name} size="small" /> : null}
                {pod.pod_amount ? <Chip icon={<SellIcon />} label={`₹${pod.pod_amount}`} size="small" /> : null}
              </Stack>
            </Stack>
          </CardContent>
        </Stack>
      </CardActionArea>
    </Card>
  );
}
