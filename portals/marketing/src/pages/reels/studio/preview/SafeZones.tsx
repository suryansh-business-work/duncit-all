import { Box, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { useTranslation } from '@duncit/shell';
import { SAFE_ZONE } from '../../composition/aspect';

/**
 * The bands a portrait network's own interface covers once the reel is
 * posted, drawn over the preview: the account name and sound above, the
 * caption and buttons below. Guides only — nothing in them is exported, and
 * the player underneath keeps its controls.
 */
export default function SafeZones() {
  const { t } = useTranslation();
  const band = (theme: Theme) => ({
    position: 'absolute' as const,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    bgcolor: alpha(theme.palette.warning.main, 0.28),
    borderColor: theme.palette.warning.main,
    color: theme.palette.common.white,
    pointerEvents: 'none' as const,
  });
  return (
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 3, overflow: 'hidden' }} data-testid="reel-safe-zones">
      <Box sx={(theme) => ({ ...band(theme), top: 0, height: `${SAFE_ZONE.topPct}%`, borderBottom: '1px dashed' })} data-testid="reel-safe-zone-top">
        <Typography variant="caption" sx={{ fontWeight: 700, textShadow: '0 1px 4px rgba(0, 0, 0, 0.8)' }}>
          {t('ai.reels.preview.safeTop')}
        </Typography>
      </Box>
      <Box sx={(theme) => ({ ...band(theme), bottom: 0, height: `${SAFE_ZONE.bottomPct}%`, borderTop: '1px dashed' })} data-testid="reel-safe-zone-bottom">
        <Typography variant="caption" sx={{ fontWeight: 700, textShadow: '0 1px 4px rgba(0, 0, 0, 0.8)' }}>
          {t('ai.reels.preview.safeBottom')}
        </Typography>
      </Box>
    </Box>
  );
}
