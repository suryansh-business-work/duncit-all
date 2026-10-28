import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { useWebT } from '../../../shared/i18n';
import { ACCENT_COLORS, THEME_ACCENT_KEYS, type ThemeAccentKey } from '../../../shared/tokens';

/**
 * A ToggleButtonGroup squares off and pulls together its middle buttons (no side
 * border, no corner radius). Pickers here lay out separate tiles and circles in a
 * wrapping row, so every button keeps its own shape.
 */
export const ungrouped = (borderRadius: string) => ({ '& .MuiToggleButtonGroup-grouped.MuiToggleButton-root': { margin: 0, border: 0, borderRadius } });

const ACCENT_DOT = {
  width: 36,
  height: 36,
  p: 0,
  '&.Mui-selected, &.Mui-selected:hover': { bgcolor: 'transparent' },
  '&.Mui-selected .accent-dot': { boxShadow: (theme: Theme) => `0 0 0 2px ${theme.vars?.palette.background.paper}, 0 0 0 4px ${theme.vars?.palette.text.primary}` },
} as const;

interface AccentPickerProps {
  value: ThemeAccentKey;
  onChange: (accent: ThemeAccentKey) => void;
  /** What the colours are for, read out before each colour's name. */
  label: string;
  testIdPrefix?: string;
}

/** The theme colours (an event's accent, a calendar's tint) as a row of named dots; the chosen one wears a ring. */
export function AccentPicker({ value, onChange, label, testIdPrefix = 'accent' }: Readonly<AccentPickerProps>) {
  const { t } = useWebT();
  return (
    <ToggleButtonGroup exclusive value={value} onChange={(_event, next: ThemeAccentKey | null) => next && onChange(next)} aria-label={label} sx={{ flexWrap: 'wrap', gap: 0.75, ...ungrouped('50%') }}>
      {THEME_ACCENT_KEYS.map((accent) => (
        <ToggleButton key={accent} value={accent} aria-label={t(`liteWeb.eventForm.accents.${accent}`)} sx={ACCENT_DOT} data-testid={`${testIdPrefix}-${accent}`}>
          <Box aria-hidden className="accent-dot" sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: ACCENT_COLORS[accent], transition: 'box-shadow 150ms' }} />
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
