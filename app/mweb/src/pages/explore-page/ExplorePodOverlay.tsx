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

const CAPTION_CLAMPED_SX = { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', opacity: 0.9 } as const;
const CAPTION_OPEN_SX = { opacity: 0.9 } as const;

/** The reel caption. A long one is a disclosure: keyboard-operable and says whether it is open. */
function ExploreCaption({ description }: Readonly<{ description: string }>) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const collapsible = description.length > CAPTION_COLLAPSE_AT;
  const text = (
    <Typography data-testid="explore-caption" variant="body2" sx={collapsible && !expanded ? CAPTION_CLAMPED_SX : CAPTION_OPEN_SX}>
      {description}
    </Typography>
  );
  if (!collapsible) {
    return <Box data-testid="explore-caption-wrap" sx={{ cursor: 'default' }}>{text}</Box>;
  }
  const toggle = () => setExpanded((v) => !v);
  return (
    <Box
      data-testid="explore-caption-wrap"
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={toggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      sx={{ cursor: 'pointer' }}
    >
      {text}
      <Typography data-testid="explore-caption-toggle" component="span" variant="caption" sx={{ fontWeight: 600 }}>
        {expanded ? t('mweb.explore.showLess') : t('mweb.explore.more')}
      </Typography>
    </Box>
  );
}

export default function ExplorePodOverlay({ pod, club, location }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { format } = usePricing();
  const isFree = pod.pod_type === 'FREE';
  const description: string = pod.pod_description ?? '';

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
            data-testid="explore-club-link"
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
              <VerifiedIcon data-testid="explore-club-verified" sx={{ fontSize: 16, color: '#1d9bf0', flex: '0 0 auto' }} titleAccess={t('mweb.explore.verifiedClub')} />
            )}
          </Stack>
        )}
        <Typography
          data-testid="explore-pod-title"
          sx={(theme) => ({
            fontSize: '1.375rem',
            fontWeight: 600,
            lineHeight: 1.15,
            textShadow: `0 2px 12px ${alpha(theme.palette.common.black, 0.36)}`,
          })}>
          {pod.pod_title}
        </Typography>
        {description && <ExploreCaption description={description} />}
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            alignItems: "center",
            flexWrap: "wrap"
          }}>
          <Chip data-testid="explore-price-chip" label={isFree ? 'Free' : format(pod.pod_amount)} sx={CHIP_SX} />
          {pod.pod_date_time && (
            <Chip data-testid="explore-date-chip" icon={<EventRoundedIcon />} label={formatDateTime(pod.pod_date_time)} sx={CHIP_SX} />
          )}
        </Stack>
      </Stack>
    </>
  );
}
