import { useNavigate } from 'react-router-dom';
import { Box, Chip, Stack, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import { usePricing } from '../../hooks/usePricing';

interface Props {
  pod: any;
  club: any;
  location: any;
}

export default function ExplorePodOverlay({ pod, club, location }: Props) {
  const navigate = useNavigate();
  const { format } = usePricing();
  const isFree = pod.pod_type?.includes('FREE');
  const placeLabel = pod.place_label || [location?.location_name, pod.zone_name].filter(Boolean).join(' - ');

  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.02) 34%, rgba(0,0,0,0.88) 100%)',
          pointerEvents: 'none',
        }}
      />
      <Stack
        sx={{
          position: 'absolute',
          left: 16,
          right: 80,
          bottom: 'calc(190px + env(safe-area-inset-bottom))',
        }}
        spacing={1}
      >
        {club && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ cursor: 'pointer' }}
            onClick={() => club.club_id && navigate(`/club/${club.club_id}`)}
          >
            <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'primary.main', display: 'grid', placeItems: 'center' }}>
              <GroupsIcon sx={{ fontSize: 15 }} />
            </Box>
            <Typography variant="subtitle2" fontWeight={900} noWrap>
              {club.club_name}
            </Typography>
          </Stack>
        )}
        <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.05, textShadow: '0 2px 12px rgba(0,0,0,0.36)' }}>
          {pod.pod_title}
        </Typography>
        {pod.pod_description && (
          <Typography
            variant="body2"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              opacity: 0.9,
            }}
          >
            {pod.pod_description}
          </Typography>
        )}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            label={isFree ? 'Free' : format(pod.pod_amount)}
            color={isFree ? 'success' : 'primary'}
            sx={{ color: 'common.white' }}
          />
          {pod.pod_date_time && (
            <Chip
              size="small"
              icon={<EventIcon sx={{ color: 'common.white !important' }} />}
              label={new Date(pod.pod_date_time).toLocaleString(undefined, {
                day: 'numeric',
                month: 'short',
                hour: 'numeric',
                minute: '2-digit',
              })}
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'common.white' }}
            />
          )}
          {placeLabel && (
            <Chip
              size="small"
              icon={<PlaceIcon sx={{ color: 'common.white !important' }} />}
              label={placeLabel}
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'common.white' }}
            />
          )}
        </Stack>
      </Stack>
    </>
  );
}
