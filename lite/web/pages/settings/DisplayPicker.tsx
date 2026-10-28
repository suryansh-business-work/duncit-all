import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import SettingsBrightnessOutlinedIcon from '@mui/icons-material/SettingsBrightnessOutlined';
import type { LiteDisplayMode } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { LITE_RADII, LITE_SCHEMES } from '../../../shared/tokens';
import { DISPLAY_MODES, useDisplayMode } from '../../lib/useDisplayMode';

const ICONS = { SYSTEM: SettingsBrightnessOutlinedIcon, LIGHT: LightModeOutlinedIcon, DARK: DarkModeOutlinedIcon } as const;

/**
 * Three separate cards, not a segmented bar: a ToggleButtonGroup squares off and
 * merges its middle buttons, so each card's shape and the chosen card's ring are
 * set here, at the group's own (higher) specificity.
 */
const CARD = '& .MuiToggleButtonGroup-grouped.MuiToggleButton-root';
const CARDS = {
  [CARD]: {
    margin: 0,
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: `${LITE_RADII.card}px`,
    bgcolor: 'background.paper',
    transition: 'border-color 150ms, box-shadow 150ms, transform 150ms',
    '&:hover': { borderColor: 'text.secondary', bgcolor: 'background.paper' },
  },
  [`${CARD}.Mui-selected, ${CARD}.Mui-selected:hover`]: {
    borderColor: 'primary.main',
    bgcolor: 'background.paper',
    boxShadow: (theme: Theme) => `0 0 0 1px ${theme.vars?.palette.primary.main}`,
  },
} as const;

/** A tiny page drawn in the scheme it stands for; System shows both halves. */
function Preview({ mode }: Readonly<{ mode: LiteDisplayMode }>) {
  const { t } = useWebT();
  const sample = t('liteWeb.settings.sample');
  const half = (scheme: 'light' | 'dark') => ({ bgcolor: LITE_SCHEMES[scheme].page, color: LITE_SCHEMES[scheme].ink, flex: 1, display: 'grid', placeItems: 'center', fontWeight: 800 });
  return (
    <Box aria-hidden sx={{ display: 'flex', width: '100%', height: 56, borderRadius: `${LITE_RADII.control}px`, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
      {mode === 'DARK' ? null : <Box sx={half('light')}>{sample}</Box>}
      {mode === 'LIGHT' ? null : <Box sx={half('dark')}>{sample}</Box>}
    </Box>
  );
}

/**
 * Light, Dark, or follow the device. The page switches at once (MUI's colour
 * scheme), and a signed-in choice is saved to the account so it follows the
 * reader to other devices.
 */
export function DisplayPicker() {
  const { t } = useWebT();
  const { current, choose } = useDisplayMode();

  return (
    <ToggleButtonGroup exclusive value={current} onChange={(_e, next: LiteDisplayMode | null) => next && choose(next)} aria-label={t('liteWeb.settings.display')} sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: { xs: 1, sm: 1.5 }, ...CARDS }} data-testid="display-picker">
      {DISPLAY_MODES.map((value) => {
        const Icon = ICONS[value];
        return (
          <ToggleButton key={value} value={value} sx={{ position: 'relative', flexDirection: 'column', alignItems: 'stretch', gap: 1, p: { xs: 0.75, sm: 1.25 } }} data-testid={`display-${value}`}>
            {current === value ? <CheckCircleIcon color="primary" aria-hidden sx={{ position: 'absolute', top: -8, right: -8, fontSize: 22, bgcolor: 'background.paper', borderRadius: '50%' }} /> : null}
            <Preview mode={value} />
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-start' }, color: current === value ? 'text.primary' : 'text.secondary' }}>
              <Icon fontSize="small" aria-hidden />
              <Typography variant="body2" sx={{ fontWeight: current === value ? 800 : 600 }}>
                {t(`liteWeb.settings.modes.${value}`)}
              </Typography>
            </Stack>
          </ToggleButton>
        );
      })}
    </ToggleButtonGroup>
  );
}
