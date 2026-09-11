import { Box, ButtonBase, Chip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReplayIcon from '@mui/icons-material/Replay';
import type { TourDefinition } from '@duncit/tours';
import { useTranslation } from '../../i18n/useTranslation';

/** One walkthrough: a play (or replay) disc, the title and what it covers, a
 * Completed pill once shown, and the chevron. Native twin: TourRow in
 * screens/TourGuideScreen. */
export default function TourRow({
  tour,
  done,
  onStart,
}: Readonly<{ tour: TourDefinition; done: boolean; onStart: () => void }>) {
  const { t } = useTranslation();
  const name = t(tour.titleKey);
  const ariaLabel = done
    ? t('mweb.tourGuide.restartAria', { vars: { name } })
    : t('mweb.tourGuide.startAria', { vars: { name } });
  return (
    <ButtonBase
      data-testid={`tour-start-${tour.id}`}
      aria-label={ariaLabel}
      onClick={onStart}
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1.75,
        textAlign: 'left',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          color: 'primary.main',
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
          '& svg': { fontSize: 20 },
        }}
      >
        {done ? <ReplayIcon /> : <PlayArrowIcon />}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 500 }}>{name}</Typography>
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{t(tour.captionKey)}</Typography>
      </Box>
      {done && (
        <Chip
          label={t('mweb.tourGuide.completed')}
          sx={{
            height: 24,
            fontSize: 11,
            color: 'success.main',
            bgcolor: (theme) => alpha(theme.palette.success.main, 0.12),
          }}
        />
      )}
      <ChevronRightIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
    </ButtonBase>
  );
}
