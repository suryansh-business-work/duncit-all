import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

type IconPosition = 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';
type FlexDirection = 'column' | 'column-reverse' | 'row' | 'row-reverse';

export interface IconLayout {
  position: IconPosition;
  width: number;
  height: number;
}

/** Icon position (relative to the label) -> flex direction of the icon+label box. */
const DIRECTION_BY_POSITION: Record<IconPosition, FlexDirection> = {
  TOP: 'column',
  BOTTOM: 'column-reverse',
  LEFT: 'row',
  RIGHT: 'row-reverse',
};

/** Default icon size (px) when a category has no `icon_layout_mweb`. */
export const DEFAULT_ICON_SIZE = 40;

interface VibeTabProps {
  label: string;
  icon: ReactNode;
  selected: boolean;
  onClick: () => void;
  /** Per-category icon layout; null keeps the default icon-over-label look. */
  layout?: IconLayout | null;
}

/** An icon+label tab for a top-level category (not an MUI Chip). The icon renders
 * full-bleed (no circular badge); its position relative to the label follows
 * `layout.position` (default TOP -> icon over label). Selected state is an
 * underline bar + primary-coloured label. */
export default function VibeTab({ label, icon, selected, onClick, layout }: Readonly<VibeTabProps>) {
  const position = layout?.position ?? 'TOP';
  const direction = DIRECTION_BY_POSITION[position];
  const isRow = direction === 'row' || direction === 'row-reverse';
  const activeColor = selected ? 'primary.main' : 'text.secondary';
  const underline = (
    <Box sx={{ height: 3, width: 22, borderRadius: 2, bgcolor: selected ? 'primary.main' : 'transparent' }} />
  );
  return (
    <Stack
      component="button"
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      alignItems="center"
      spacing={0.5}
      sx={{
        flex: '0 0 auto',
        width: 76,
        px: 0.5,
        py: 0.75,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        color: activeColor,
      }}
    >
      <Stack direction={direction} alignItems="center" justifyContent="center" spacing={0.5} sx={{ color: activeColor }}>
        <Box sx={{ minHeight: 46, display: 'grid', placeItems: 'center' }}>{icon}</Box>
        {!isRow && underline}
        <Typography variant="caption" sx={{ fontWeight: selected ? 900 : 700, lineHeight: 1.15, textAlign: 'center' }} noWrap>
          {label}
        </Typography>
      </Stack>
      {isRow && underline}
    </Stack>
  );
}
