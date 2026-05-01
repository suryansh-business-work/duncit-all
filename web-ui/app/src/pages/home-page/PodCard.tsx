import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import { usePricing } from '../../hooks/usePricing';

export default function PodCard({ pod, onOpen }: { pod: any; onOpen: () => void }) {
  const isFree = pod.pod_type?.includes('FREE');
  const { format } = usePricing();
  return (
    <Card
      sx={{
        minWidth: 240,
        maxWidth: 240,
        flex: '0 0 auto',
        scrollSnapAlign: 'start',
      }}
      variant="outlined"
    >
      <CardActionArea onClick={onOpen}>
        {pod.pod_images_and_videos?.[0]?.url ? (
          <CardMedia
            component="img"
            image={pod.pod_images_and_videos[0].url}
            alt={pod.pod_title}
            sx={{ height: 140, objectFit: 'cover' }}
          />
        ) : (
          <Box
            sx={{
              height: 140,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'action.hover',
            }}
          >
            <EventIcon fontSize="large" color="action" />
          </Box>
        )}
        <CardContent sx={{ pb: '12px !important' }}>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: 40,
            }}
          >
            {pod.pod_title}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {pod.pod_date_time
              ? new Date(pod.pod_date_time).toLocaleString(undefined, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : '—'}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
            <Chip
              size="small"
              label={isFree ? 'Free' : format(pod.pod_amount)}
              color={isFree ? 'success' : 'primary'}
              variant={isFree ? 'outlined' : 'filled'}
            />
            {pod.no_of_spots > 0 && (
              <Typography variant="caption" color="text.secondary">
                {pod.pod_attendees?.length ?? 0}/{pod.no_of_spots} spots
              </Typography>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
