import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Chip, Stack, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import VerifiedIcon from '@mui/icons-material/Verified';
import GroupIcon from '@mui/icons-material/Group';
import { usePricing } from '../../hooks/usePricing';
import { podStatus, podStatusChip } from '../../utils/podStatus';

interface Props {
  pod: any;
  club: any;
  location: any;
}

const CAPTION_COLLAPSE_AT = 90;

export default function ExplorePodOverlay({ pod, club, location }: Readonly<Props>) {
  const navigate = useNavigate();
  const { format } = usePricing();
  const [expanded, setExpanded] = useState(false);
  const isFree = pod.pod_type?.includes('FREE');
  const placeLabel = pod.place_label || [location?.location_name, pod.zone_name].filter(Boolean).join(' - ');
  const description: string = pod.pod_description ?? '';
  const collapsible = description.length > CAPTION_COLLAPSE_AT;
  // Event status + capacity badges (explore item 16).
  const spots = pod.no_of_spots ?? 0;
  const attendees = pod.pod_attendees?.length ?? 0;
  const soldOut = spots > 0 && attendees >= spots;
  const statusChip = podStatusChip(podStatus(pod.pod_date_time, pod.pod_end_time));

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
          bottom: 'calc(var(--duncit-bottom-nav-overlay-offset, 88px) + 106px)',
        }}
        spacing={1}
      >
        {club && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            role="button"
            tabIndex={0}
            aria-label={`Open ${club.club_name} club`}
            sx={{ cursor: 'pointer' }}
            onClick={() => club.club_id && navigate(`/club/${club.club_id}`)}
            onDoubleClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && club.club_id) navigate(`/club/${club.club_id}`);
            }}
          >
            <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'primary.main', display: 'grid', placeItems: 'center' }}>
              <GroupsIcon sx={{ fontSize: 15 }} />
            </Box>
            <Typography variant="subtitle2" fontWeight={900} noWrap>
              {club.club_name}
            </Typography>
            {club.is_verified && (
              <VerifiedIcon sx={{ fontSize: 16, color: '#1d9bf0', flex: '0 0 auto' }} aria-label="Verified club" />
            )}
          </Stack>
        )}
        <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.05, textShadow: '0 2px 12px rgba(0,0,0,0.36)' }}>
          {pod.pod_title}
        </Typography>
        {description && (
          <Box
            onClick={() => collapsible && setExpanded((v) => !v)}
            onDoubleClick={(e) => collapsible && e.stopPropagation()}
            sx={{ cursor: collapsible ? 'pointer' : 'default' }}
          >
            <Typography
              variant="body2"
              sx={
                collapsible && !expanded
                  ? { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', opacity: 0.9 }
                  : { opacity: 0.92 }
              }
            >
              {description}
            </Typography>
            {collapsible && (
              <Typography component="span" variant="caption" sx={{ fontWeight: 800, opacity: 0.85 }}>
                {expanded ? 'Show less' : 'More'}
              </Typography>
            )}
          </Box>
        )}
        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            label={soldOut ? 'Sold Out' : statusChip.label}
            color={soldOut ? 'error' : statusChip.color}
            sx={{ fontWeight: 800, color: soldOut || statusChip.color !== 'default' ? 'common.white' : undefined }}
          />
          {spots > 0 && (
            <Chip
              size="small"
              icon={<GroupIcon sx={{ color: 'common.white !important' }} />}
              label={`${attendees}/${spots}`}
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'common.white' }}
            />
          )}
        </Stack>
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
