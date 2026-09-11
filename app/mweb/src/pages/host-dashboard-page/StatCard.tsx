import { Box, Typography } from '@mui/material';
import { SURFACE_SX } from '../../theme';

/** The round 40px disc a dashboard icon sits in — accent glyph on the soft fill. */
export const ICON_DISC_SX = {
  width: 40,
  height: 40,
  flexShrink: 0,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  bgcolor: 'action.hover',
  color: 'secondary.main',
} as const;

interface Props {
  label: string;
  value: string;
  /** `lg` for a short count, `md` for money that must not be cut off. */
  size?: 'md' | 'lg';
}

/**
 * One dashboard stat: a muted label over the figure, on a surface card.
 * Native twin: components/studio/StatTile.
 */
export default function StatCard({ label, value, size = 'md' }: Readonly<Props>) {
  return (
    <Box sx={{ ...SURFACE_SX, p: 2, flex: 1, minWidth: 0 }}>
      <Typography
        variant="caption"
        noWrap
        sx={{ display: 'block', color: 'text.secondary', fontWeight: 600 }}
      >
        {label}
      </Typography>
      <Typography
        noWrap
        sx={{ mt: 0.5, fontSize: size === 'lg' ? '1.5rem' : '1.25rem', fontWeight: 700, lineHeight: 1.2 }}
      >
        {value}
      </Typography>
    </Box>
  );
}
