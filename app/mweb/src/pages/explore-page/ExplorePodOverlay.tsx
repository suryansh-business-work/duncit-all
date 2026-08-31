import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Box, Chip, Stack, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import EventIcon from '@mui/icons-material/Event';
import VerifiedIcon from '@mui/icons-material/Verified';
import { usePricing } from '../../hooks/usePricing';
import { formatDateTime } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  pod: any;
  club: any;
  location: any;
}

const CAPTION_COLLAPSE_AT = 90;

export default function ExplorePodOverlay({ pod, club, location }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { format } = usePricing();
  const [expanded, setExpanded] = useState(false);
  const isFree = pod.pod_type === 'FREE';
  const description: string = pod.pod_description ?? '';
  const collapsible = description.length > CAPTION_COLLAPSE_AT;

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
            role="button"
            tabIndex={0}
            aria-label={`Open ${club.club_name} club`}
            onClick={() => club.club_id && navigate(`/club/${club.club_id}`)}
            onDoubleClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && club.club_id) navigate(`/club/${club.club_id}`);
            }}
            sx={{
              alignItems: "center",
              cursor: 'pointer'
            }}>
            <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'primary.main', display: 'grid', placeItems: 'center' }}>
              <GroupsIcon sx={{ fontSize: 15 }} />
            </Box>
            <Typography variant="subtitle2" noWrap sx={{
              fontWeight: 700
            }}>
              {club.club_name}
            </Typography>
            {club.is_verified && (
              <VerifiedIcon sx={{ fontSize: 16, color: '#1d9bf0', flex: '0 0 auto' }} aria-label={t('mweb.explore.verifiedClub')} />
            )}
          </Stack>
        )}
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            lineHeight: 1.05,
            textShadow: '0 2px 12px rgba(0,0,0,0.36)'
          }}>
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
              <Typography component="span" variant="caption" sx={{ fontWeight: 600, opacity: 0.85 }}>
                {expanded ? 'Show less' : 'More'}
              </Typography>
            )}
          </Box>
        )}
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            alignItems: "center",
            flexWrap: "wrap"
          }}>
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
              label={formatDateTime(pod.pod_date_time)}
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'common.white' }}
            />
          )}
        </Stack>
      </Stack>
    </>
  );
}
