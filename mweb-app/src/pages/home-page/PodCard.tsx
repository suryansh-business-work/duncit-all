import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/PersonOutline';
import GroupIcon from '@mui/icons-material/GroupOutlined';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { usePricing } from '../../hooks/usePricing';

export default function PodCard({
  pod,
  onOpen,
  hostName,
}: {
  pod: any;
  onOpen: () => void;
  hostName?: string | null;
}) {
  const isFree = pod.pod_type?.includes('FREE');
  const { format } = usePricing();
  const placeText = [pod.place_label, pod.place_detail].filter(Boolean).join(' - ');
  return (
    <Card
      onClick={onOpen}
      sx={{
        minWidth: 264,
        maxWidth: 264,
        flex: '0 0 auto',
        scrollSnapAlign: 'start',
        borderRadius: 4,
        cursor: 'pointer',
        bgcolor: 'background.paper',
        background: (theme) => `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`,
        boxShadow: '0 18px 42px rgba(9,7,18,0.22)',
        border: 1,
        borderColor: 'divider',
        overflow: 'hidden',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 22px 48px rgba(255,79,115,0.20)',
        },
      }}
    >
      <Box sx={{ p: 1 }}>
        {(() => {
          const first = pod.pod_images_and_videos?.[0];
          if (!first) {
            return (
              <Box
                sx={{
                  height: 168,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 3,
                  bgcolor: 'action.hover',
                  background: 'linear-gradient(145deg, #ff8b5f 0%, #ed4f7a 50%, #16121f 100%)',
                }}
              >
                <EventIcon fontSize="large" sx={{ color: 'common.white' }} />
              </Box>
            );
          }
          if (first.type === 'VIDEO') {
            return (
              <Box
                component="video"
                src={first.url}
                autoPlay
                muted
                loop
                playsInline
                sx={{ width: '100%', height: 168, objectFit: 'cover', display: 'block', borderRadius: 3 }}
              />
            );
          }
          return (
            <CardMedia
              component="img"
              image={first.url}
              alt={pod.pod_title}
              sx={{ height: 168, objectFit: 'cover', borderRadius: 3 }}
            />
          );
        })()}
      </Box>
        <CardContent sx={{ p: 2, pb: '16px !important' }}>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
            <Chip
              size="small"
              label={isFree ? 'Free' : format(pod.pod_amount)}
              color={isFree ? 'success' : 'primary'}
              sx={{ height: 24, fontWeight: 900 }}
            />
            <Stack direction="row" spacing={0.35} alignItems="center" sx={{ minWidth: 0 }}>
              <GroupIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }} noWrap>
                {pod.pod_attendees?.length ?? 0}{pod.no_of_spots > 0 ? `/${pod.no_of_spots}` : ''}
              </Typography>
            </Stack>
          </Stack>
          <Typography
            variant="subtitle1"
            fontWeight={900}
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.2,
              minHeight: '2.4em',
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
          {placeText && (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.75 }}>
              <PlaceIcon sx={{ fontSize: 14, color: 'text.secondary', flex: '0 0 auto' }} />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {placeText}
              </Typography>
            </Stack>
          )}
          <Button
            fullWidth
            variant="contained"
            size="small"
            endIcon={<ArrowForwardIcon />}
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
            sx={{ mt: 1.5, borderRadius: 999, fontWeight: 900 }}
          >
            Book
          </Button>
          {hostName && (
            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              sx={{ mt: 0.75 }}
            >
              <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                Hosted by {hostName}
              </Typography>
            </Stack>
          )}
        </CardContent>
    </Card>
  );
}
