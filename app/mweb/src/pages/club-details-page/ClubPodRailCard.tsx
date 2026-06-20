import EventIcon from '@mui/icons-material/Event';
import { Box, Button, Card, CardMedia, Typography } from '@mui/material';

interface Props {
  pod: any;
  priceFormat: (value: number) => string;
  onOpen: (id: string) => void;
}

/** Compact fixed-width pod card used inside the horizontal Pods Schedule rails. */
export default function ClubPodRailCard({ pod, priceFormat, onOpen }: Readonly<Props>) {
  const isFree = pod.pod_type?.includes('FREE');
  const cover = pod.pod_images_and_videos?.[0]?.url;
  const dateLabel = pod.pod_date_time
    ? new Date(pod.pod_date_time)
        .toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
        .toUpperCase()
    : 'TBA';

  return (
    <Card
      variant="outlined"
      sx={{ width: 168, flex: '0 0 auto', borderRadius: 3, overflow: 'hidden', bgcolor: 'background.paper' }}
    >
      {cover ? (
        <CardMedia component="img" image={cover} alt={pod.pod_title} sx={{ height: 96, objectFit: 'cover' }} />
      ) : (
        <Box sx={{ height: 96, display: 'grid', placeItems: 'center', background: 'linear-gradient(145deg, #ff8b5f 0%, #ed4f7a 100%)' }}>
          <EventIcon sx={{ color: 'common.white' }} />
        </Box>
      )}
      <Box sx={{ p: 1 }}>
        <Typography variant="caption" color="primary.main" sx={{ fontWeight: 950 }}>
          {dateLabel}
        </Typography>
        <Typography
          variant="subtitle2"
          fontWeight={900}
          sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.15, minHeight: 34 }}
        >
          {pod.pod_title}
        </Typography>
        <Button
          fullWidth
          size="small"
          variant="contained"
          onClick={() => onOpen(pod.id)}
          sx={{
            mt: 0.75,
            borderRadius: 999,
            fontWeight: 900,
            background: 'linear-gradient(135deg, #ff4f73 0%, #ff8b5f 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #ef3b63 0%, #f9794d 100%)' },
          }}
        >
          {isFree ? 'Free' : priceFormat(pod.pod_amount)}
        </Button>
      </Box>
    </Card>
  );
}
