import type { ChangeEvent } from 'react';
import { Box } from '@mui/material';
import { isHexColor } from '@duncit/regex';
import { tokens } from '@duncit/theme';

/** `#rgb` as `#rrggbb` — the only form a native colour input takes. Anything else falls back. */
export function toSixDigitHex(value: string, fallback: string = tokens.common.black): string {
  const hex = value.trim();
  if (!isHexColor(hex)) return fallback;
  if (hex.length === 7) return hex;
  return `#${[...hex.slice(1)].map((digit) => digit + digit).join('')}`;
}

interface Props {
  value: string;
  onChange: (hex: string) => void;
  /** What the picker changes, for a screen reader. */
  label: string;
  disabled?: boolean;
}

/**
 * The browser's own colour picker, drawn as a round swatch of the colour it
 * holds: keyboard-operable everywhere and needing no picker of our own.
 */
export default function ColorInput({ value, onChange, label, disabled }: Readonly<Props>) {
  return (
    <Box
      component="input"
      type="color"
      value={toSixDigitHex(value)}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value.toUpperCase())}
      aria-label={label}
      disabled={disabled}
      sx={{
        width: (th) => th.spacing(3.5),
        height: (th) => th.spacing(3.5),
        p: 0,
        border: 1,
        borderColor: 'divider',
        borderRadius: '50%',
        overflow: 'hidden',
        bgcolor: 'transparent',
        cursor: 'pointer',
        flexShrink: 0,
        '&::-webkit-color-swatch-wrapper': { p: 0 },
        '&::-webkit-color-swatch': { border: 'none', borderRadius: '50%' },
        '&::-moz-color-swatch': { border: 'none', borderRadius: '50%' },
        '&:focus-visible': { outline: 2, outlineColor: 'primary.main', outlineOffset: 2 },
      }}
    />
  );
}
