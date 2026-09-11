import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
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

/** Translucent white over the scrim — every chip and the club disc on a reel. */
const glass = (theme: Theme) => alpha(theme.palette.common.white, 0.16);

const CHIP_SX = (theme: Theme) => ({
  height: 28,
  bgcolor: glass(theme),
  color: 'common.white',
  fontWeight: 600,
  backdropFilter: 'blur(8px)',
  '& .MuiChip-icon': { color: 'common.white', fontSize: 15 },
});

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
          // Black scrim over the reel — media chrome, the same in both modes.
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.02) 34%, rgba(0,0,0,0.88) 100%)',
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
            <Box sx={(theme) => ({ width: 26, height: 26, borderRadius: '50%', bgcolor: glass(theme), display: 'grid', placeItems: 'center' })}>
              <GroupsRoundedIcon sx={{ fontSize: 15 }} />
            </Box>
            <Typography variant="subtitle2" noWrap sx={{
              fontWeight: 600
            }}>
              {club.club_name}
            </Typography>
            {club.is_verified && (
              <VerifiedIcon sx={{ fontSize: 16, color: '#1d9bf0', flex: '0 0 auto' }} aria-label={t('mweb.explore.verifiedClub')} />
            )}
          </Stack>
        )}
        <Typography
          sx={(theme) => ({
            fontSize: '1.375rem',
            fontWeight: 600,
            lineHeight: 1.15,
            textShadow: `0 2px 12px ${alpha(theme.palette.common.black, 0.36)}`,
          })}>
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
                  : { opacity: 0.9 }
              }
            >
              {description}
            </Typography>
            {collapsible && (
              <Typography component="span" variant="caption" sx={{ fontWeight: 600 }}>
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
          <Chip label={isFree ? 'Free' : format(pod.pod_amount)} sx={CHIP_SX} />
          {pod.pod_date_time && (
            <Chip icon={<EventRoundedIcon />} label={formatDateTime(pod.pod_date_time)} sx={CHIP_SX} />
          )}
        </Stack>
      </Stack>
    </>
  );
}
