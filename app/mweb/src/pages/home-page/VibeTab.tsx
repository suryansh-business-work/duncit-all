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

/** An icon+label CARD tile for a top-level category — the mock's vibe tile:
 * a rounded card with the icon over the label, selected = primary border and a
 * soft primary fill. The admin icon layout (position/size) still applies. */
export default function VibeTab({ label, icon, selected, onClick, layout }: Readonly<VibeTabProps>) {
  const position = layout?.position ?? 'TOP';
  const direction = DIRECTION_BY_POSITION[position];
  const isRow = direction === 'row' || direction === 'row-reverse';
  return (
    <Stack
      component="button"
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      alignItems="center"
      justifyContent="center"
      spacing={0.5}
      sx={{
        // Fixed width so every tile in the rail matches (user ask).
        flex: '0 0 auto',
        width: 92,
        px: 1,
        py: 1.1,
        border: 1.5,
        borderStyle: 'solid',
        borderColor: selected ? 'primary.main' : 'divider',
        borderRadius: '16px',
        bgcolor: (theme) => {
          if (!selected) return theme.palette.background.paper;
          const tint = theme.palette.mode === 'dark' ? 0.16 : 0.07;
          return `rgba(255,79,115,${tint})`;
        },
        cursor: 'pointer',
        color: selected ? 'primary.main' : 'text.secondary',
        transition: 'border-color 160ms ease, background-color 160ms ease',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <Stack
        direction={direction}
        alignItems="center"
        justifyContent="center"
        spacing={isRow ? 0.75 : 0.5}
      >
        <Box sx={{ minHeight: isRow ? 'auto' : 46, display: 'grid', placeItems: 'center' }}>{icon}</Box>
        <Typography
          variant="caption"
          sx={{
            fontWeight: selected ? 700 : 600,
            lineHeight: 1.15,
            textAlign: 'center',
            color: selected ? 'primary.main' : 'text.primary',
          }}
          noWrap
        >
          {label}
        </Typography>
      </Stack>
    </Stack>
  );
}
