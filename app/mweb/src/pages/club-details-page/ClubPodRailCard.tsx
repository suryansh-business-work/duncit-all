import EventIcon from '@mui/icons-material/EventRounded';
import { Box, Card, CardMedia, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { coverImageUrl } from '@duncit/utils';
import { formatDate } from '../../utils/dateFormat';

interface Props {
  pod: any;
  priceFormat: (value: number) => string;
  onOpen: (id: string) => void;
}

/** 18px media corners inside the card's padding, like the Home pod card. */
const MEDIA_SX = { height: 104, borderRadius: '18px' } as const;

/**
 * Compact fixed-width pod card used inside the horizontal Pods Schedule rails —
 * the Home pod card's look in a narrow frame: the photo inside the padding
 * with a small date pill over its top-left, the title, and a green price pill
 * that opens the pod.
 */
export default function ClubPodRailCard({ pod, priceFormat, onOpen }: Readonly<Props>) {
  const isFree = pod.pod_type === 'FREE';
  const cover = coverImageUrl(pod.pod_images_and_videos);
  const dateLabel = formatDate(pod.pod_date_time).toUpperCase() || 'TBA';

  return (
    <Card sx={{ width: 180, flex: '0 0 auto', p: 1 }}>
      <Box sx={{ position: 'relative' }}>
        {cover ? (
          <CardMedia component="img" image={cover} alt={pod.pod_title} sx={{ ...MEDIA_SX, objectFit: 'cover' }} />
        ) : (
          <Box sx={{ ...MEDIA_SX, display: 'grid', placeItems: 'center', bgcolor: 'action.hover', color: 'secondary.main' }}>
            <EventIcon />
          </Box>
        )}
        <Typography
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            px: 1,
            py: 0.25,
            borderRadius: 999,
            bgcolor: 'background.paper',
            color: 'text.primary',
            fontSize: '0.6875rem',
            fontWeight: 600,
          }}
        >
          {dateLabel}
        </Typography>
      </Box>
      <Box sx={{ px: 0.5, pt: 1 }}>
        <Typography
          sx={{
            fontSize: '0.875rem',
            fontWeight: 600,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.25,
            minHeight: 35
          }}>
          {pod.pod_title}
        </Typography>
        <DuncitButton
          fullWidth
          size="small"
          variant="contained"
          onClick={() => onOpen(pod.id)}
          sx={{ mt: 1, minHeight: 36 }}
        >
          {isFree ? 'Free' : priceFormat(pod.pod_amount)}
        </DuncitButton>
      </Box>
    </Card>
  );
}
