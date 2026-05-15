import { Box, Chip, Stack, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import GroupIcon from '@mui/icons-material/GroupOutlined';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import { useNavigate } from 'react-router-dom';
import { podUrl } from '../../utils/seoUrls';

interface HomeFeaturedPodsProps {
  pods: any[];
}

function formatPodDate(value?: string | null) {
  if (!value) return 'Date pending';
  return new Date(value).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function mediaOf(pod: any) {
  return pod.pod_images_and_videos?.[0] ?? null;
}

export default function HomeFeaturedPods({ pods }: HomeFeaturedPodsProps) {
  const navigate = useNavigate();
  if (pods.length === 0) return null;

  return (
    <Box
      sx={{
        mx: { xs: -1.25, sm: -2 },
        px: { xs: 1.25, sm: 2 },
        overflowX: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      <Stack direction="row" spacing={1.4} sx={{ width: 'max-content', pb: 0.75 }}>
        {pods.map((pod) => {
          const media = mediaOf(pod);
          const attendees = pod.pod_attendees?.length ?? 0;
          const placeText = [pod.place_label, pod.place_detail].filter(Boolean).join(' - ');
          return (
            <Box
              key={pod.id}
              component="button"
              type="button"
              onClick={() => navigate(podUrl(pod.club_slug, pod.pod_id))}
              sx={{
                width: { xs: 'min(86vw, 340px)', sm: 340 },
                height: 248,
                flex: '0 0 auto',
                p: 0,
                border: 0,
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative',
                textAlign: 'left',
                color: 'common.white',
                bgcolor: 'grey.900',
                cursor: 'pointer',
                scrollSnapAlign: 'start',
                boxShadow: '0 18px 42px rgba(15,23,42,0.20)',
              }}
            >
              {media?.type === 'VIDEO' ? (
                <Box component="video" src={media.url} autoPlay muted loop playsInline sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : media?.url ? (
                <Box component="img" src={media.url} alt={pod.pod_title} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Box sx={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #6b4b22 0%, #17110d 100%)' }}>
                  <EventIcon sx={{ fontSize: 64, opacity: 0.72 }} />
                </Box>
              )}
              <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.18) 42%, rgba(0,0,0,0.84) 100%)' }} />
              <Stack spacing={1} sx={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  {attendees > 0 && (
                    <Chip
                      size="small"
                      label={`${attendees} joining now`}
                      sx={{ bgcolor: 'rgba(34,197,94,0.22)', color: '#7cf8ad', fontWeight: 900 }}
                    />
                  )}
                  <Chip size="small" icon={<EventIcon />} label={formatPodDate(pod.pod_date_time)} sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 800, '& .MuiChip-icon': { color: '#fff' } }} />
                </Stack>
                <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.05, textShadow: '0 2px 10px rgba(0,0,0,0.35)' }}>
                  {pod.pod_title}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                  <GroupIcon sx={{ fontSize: 16, flex: '0 0 auto' }} />
                  <Typography variant="caption" sx={{ fontWeight: 800 }} noWrap>
                    {attendees}{pod.no_of_spots > 0 ? `/${pod.no_of_spots}` : ''} going
                  </Typography>
                  {placeText && <PlaceIcon sx={{ fontSize: 15, opacity: 0.9, flex: '0 0 auto' }} />}
                  {placeText && (
                    <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.9 }} noWrap>
                      {placeText}
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}