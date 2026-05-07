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
        minWidth: 264,
        maxWidth: 264,
        flex: '0 0 auto',
        scrollSnapAlign: 'start',
        borderRadius: 3,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 4px 14px rgba(15,23,42,0.06)',
        border: 'none',
        overflow: 'hidden',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 2px 4px rgba(15,23,42,0.06), 0 10px 24px rgba(15,23,42,0.10)',
        },
      }}
    >
      <CardActionArea onClick={onOpen} sx={{ height: '100%' }}>
        {pod.pod_images_and_videos?.[0]?.url ? (
          <CardMedia
            component="img"
            image={pod.pod_images_and_videos[0].url}
            alt={pod.pod_title}
            sx={{ height: 168, objectFit: 'cover' }}
          />
        ) : (
          <Box
            sx={{
              height: 168,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'action.hover',
            }}
          >
            <EventIcon fontSize="large" color="action" />
          </Box>
        )}
        <CardContent sx={{ p: 2, pb: '16px !important' }}>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.4,
              minHeight: '2.8em',
              mb: 0.75,
            }}
          >
            {pod.pod_title}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.5 }}>
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
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
            <Chip
              size="small"
              label={isFree ? 'Free' : format(pod.pod_amount)}
              color={isFree ? 'success' : 'primary'}
              variant={isFree ? 'outlined' : 'filled'}
              sx={{ fontWeight: 600 }}
            />
            {pod.no_of_spots > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                {pod.pod_attendees?.length ?? 0}/{pod.no_of_spots} spots
              </Typography>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
