import { useId } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { useWebT } from '../../../../shared/i18n';
import { EVENT_THEME_KEYS, LITE_RADII } from '../../../../shared/tokens';
import { AccentPicker, ungrouped } from '../../../components/theme/AccentPicker';
import { themeBackground } from '../../../components/theme/EventThemeBackdrop';
import type { EventFormValues } from '../event.types';

const SWATCH = { width: 56, height: 40, borderRadius: `${LITE_RADII.control}px`, border: 1, borderColor: 'divider', bgcolor: 'background.paper', transition: 'box-shadow 150ms' } as const;

/** Separate tiles in a wrapping row; the chosen one gets a ring. */
const THEME_TILE = {
  flexDirection: 'column',
  gap: 0.5,
  p: 0.75,
  color: 'text.secondary',
  '&.Mui-selected, &.Mui-selected:hover': { bgcolor: 'transparent', color: 'text.primary' },
  '&.Mui-selected .theme-swatch': { boxShadow: (theme: Theme) => `0 0 0 2px ${theme.vars?.palette.background.paper}, 0 0 0 4px ${theme.vars?.palette.text.primary}` },
} as const;

/** The look of the event page: a theme (Minimal, Gradient, Ambient, Pattern, Confetti) and its colour. */
export function ThemePicker() {
  const { t } = useWebT();
  const labelId = useId();
  const { control } = useFormContext<EventFormValues>();
  const { field: themeField } = useController({ control, name: 'theme_key' });
  const { field: accentField } = useController({ control, name: 'theme_accent' });
  return (
    <Stack spacing={1.5} data-testid="theme-picker">
      <Typography variant="body2" component="h2" sx={{ fontWeight: 700 }} id={labelId}>
        {t('liteWeb.eventForm.theme')}
      </Typography>
      <ToggleButtonGroup exclusive value={themeField.value} onChange={(_event, next: EventFormValues['theme_key'] | null) => next && themeField.onChange(next)} aria-labelledby={labelId} sx={{ flexWrap: 'wrap', gap: 1, ...ungrouped(`${LITE_RADII.control}px`) }}>
        {EVENT_THEME_KEYS.map((key) => (
          <ToggleButton key={key} value={key} sx={THEME_TILE} data-testid={`theme-${key}`}>
            <Box aria-hidden className="theme-swatch" sx={{ ...SWATCH, background: themeBackground(key, accentField.value) }} />
            <Typography variant="caption" sx={{ fontWeight: themeField.value === key ? 800 : 600 }}>
              {t(`liteWeb.eventForm.themes.${key}`)}
            </Typography>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <AccentPicker value={accentField.value} onChange={accentField.onChange} label={t('liteWeb.eventForm.themeColor')} />
    </Stack>
  );
}
