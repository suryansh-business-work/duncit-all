import { useId } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useWebT } from '../../../../shared/i18n';
import { ACCENT_COLORS, EVENT_THEME_KEYS, LITE_RADII, THEME_ACCENT_KEYS } from '../../../../shared/tokens';
import { themeBackground } from '../../../components/theme/EventThemeBackdrop';
import type { EventFormValues } from '../event.types';

const SWATCH = { width: 56, height: 40, borderRadius: `${LITE_RADII.control}px`, border: 1, borderColor: 'divider', bgcolor: 'background.paper' } as const;

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
      <ToggleButtonGroup exclusive value={themeField.value} onChange={(_event, next: EventFormValues['theme_key'] | null) => next && themeField.onChange(next)} aria-labelledby={labelId} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {EVENT_THEME_KEYS.map((key) => (
          <ToggleButton key={key} value={key} sx={{ flexDirection: 'column', gap: 0.5, p: 0.75, border: 0, borderRadius: `${LITE_RADII.control}px` }} data-testid={`theme-${key}`}>
            <Box aria-hidden sx={{ ...SWATCH, background: themeBackground(key, accentField.value) }} />
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {t(`liteWeb.eventForm.themes.${key}`)}
            </Typography>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <ToggleButtonGroup exclusive value={accentField.value} onChange={(_event, next: EventFormValues['theme_accent'] | null) => next && accentField.onChange(next)} aria-label={t('liteWeb.eventForm.themeColor')} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
        {THEME_ACCENT_KEYS.map((accent) => (
          <ToggleButton
            key={accent}
            value={accent}
            aria-label={t(`liteWeb.eventForm.accents.${accent}`)}
            sx={{ width: 36, height: 36, p: 0, borderRadius: '50%', border: 2, borderColor: 'transparent', '&.Mui-selected': { borderColor: 'text.primary' } }}
            data-testid={`accent-${accent}`}
          >
            <Box aria-hidden sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: ACCENT_COLORS[accent] }} />
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}
