import { Badge, Stack, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { DuncitIconButton } from '@duncit/buttons';
import type { ExploreFilters } from './exploreFilters';
import { useTranslation } from '../../i18n/useTranslation';

interface ExploreHeaderProps {
  filters: ExploreFilters;
  setFilters: (filters: ExploreFilters) => void;
  activeCount: number;
  resultCount: number;
  onOpenFilters: () => void;
  onRefresh: () => void;
}

/** The dark translucent disc every control over the reel sits on — a black
 * scrim over media, legible on any frame in either theme. */
const scrim = (theme: Theme) => alpha(theme.palette.common.black, 0.42);

const HEADER_BTN_SX = (theme: Theme) => ({
  width: 40,
  height: 40,
  minHeight: 40,
  bgcolor: scrim(theme),
  color: 'common.white',
  backdropFilter: 'blur(8px)',
  '&:hover': { bgcolor: alpha(theme.palette.common.black, 0.55) },
});

export default function ExploreHeader({
  activeCount,
  resultCount,
  onOpenFilters,
  onRefresh,
}: Readonly<ExploreHeaderProps>) {
  const { t } = useTranslation();
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 3, alignItems: 'center' }}
    >
      {/* The live count is the only line the header keeps — the tab bar
          already says this is Explore. */}
      <Typography
        sx={(theme) => ({
          px: 1.5,
          py: 0.75,
          borderRadius: 999,
          bgcolor: scrim(theme),
          backdropFilter: 'blur(8px)',
          color: 'common.white',
          fontSize: '0.75rem',
          fontWeight: 600,
          lineHeight: 1.2,
        })}
      >
        {`${resultCount} live`}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ flex: 1, justifyContent: 'flex-end' }}>
        <DuncitIconButton onClick={onRefresh} sx={HEADER_BTN_SX} aria-label={t('mweb.explore.refreshFeed')}>
          <RefreshRoundedIcon fontSize="small" />
        </DuncitIconButton>
        <DuncitIconButton onClick={onOpenFilters} sx={HEADER_BTN_SX} aria-label={t('mweb.explore.openFilters')}>
          <Badge badgeContent={activeCount} color="secondary" overlap="circular">
            <TuneRoundedIcon fontSize="small" />
          </Badge>
        </DuncitIconButton>
      </Stack>
    </Stack>
  );
}
