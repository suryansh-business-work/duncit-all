import { Box, Card, CardActionArea, CardMedia, Chip, Stack, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/EventRounded';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import SellIcon from '@mui/icons-material/SellOutlined';
import { isVideoMedia, videoSourceUrl } from '@duncit/utils';
import type { SavedPod } from './queries';
import { formatDateTime } from '../../utils/dateFormat';

function formatDate(value?: string | null) {
  if (!value) return 'Date pending';
  return formatDateTime(value);
}

/** Media sits inside the card's padding with its own 18px corners. */
const MEDIA_SX = { width: 96, height: 96, borderRadius: '18px', flex: '0 0 auto' } as const;

interface Props {
  pod: SavedPod;
  onOpen: (pod: SavedPod) => void;
}

export default function SavedItemCard({ pod, onOpen }: Readonly<Props>) {
  const media = pod.pod_images_and_videos?.[0];
  const isVideo = isVideoMedia(media);
  return (
    <Card>
      <CardActionArea onClick={() => onOpen(pod)}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 1.5 }}>
          {media?.url ? (
            <CardMedia
              component={isVideo ? 'video' : 'img'}
              image={isVideo ? undefined : media.url}
              src={isVideo ? videoSourceUrl(media.url) : undefined}
              sx={{ ...MEDIA_SX, objectFit: 'cover' }}
            />
          ) : (
            <Box sx={{ ...MEDIA_SX, bgcolor: 'action.hover', color: 'secondary.main', display: 'grid', placeItems: 'center' }}>
              <EventIcon />
            </Box>
          )}
          <Stack spacing={0.75} sx={{ minWidth: 0, flex: 1 }}>
            <Typography noWrap sx={{ fontSize: '1rem', fontWeight: 600 }}>
              {pod.pod_title}
            </Typography>
            <Typography variant="body2" noWrap sx={{
              color: "text.secondary"
            }}>
              {pod.pod_description}
            </Typography>
            <Stack direction="row" spacing={0.75} useFlexGap sx={{
              flexWrap: "wrap"
            }}>
              <Chip icon={<EventIcon />} label={formatDate(pod.pod_date_time)} size="small" />
              {pod.zone_name ? <Chip icon={<PlaceIcon />} label={pod.zone_name} size="small" /> : null}
              {pod.pod_amount ? <Chip icon={<SellIcon />} label={`₹${pod.pod_amount}`} size="small" /> : null}
            </Stack>
          </Stack>
        </Stack>
      </CardActionArea>
    </Card>
  );
}
