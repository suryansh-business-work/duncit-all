import type { ReactNode } from 'react';
import { Box } from '@mui/material';

interface Props {
  children: ReactNode;
  /** Outer diameter in px. */
  size?: number;
  /** `accent` for a feature icon, `danger` for the destructive row. */
  tone?: 'accent' | 'danger' | 'muted';
}

const TONE_COLOR = { accent: 'secondary.main', danger: 'error.main', muted: 'text.secondary' } as const;

/**
 * The round soft disc a settings/list row leads with — the calm design's one
 * icon treatment across Profile, Account and the preference screens.
 * Native twin: components/account/IconDisc.
 */
export default function IconDisc({ children, size = 36, tone = 'accent' }: Readonly<Props>) {
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        bgcolor: 'action.hover',
        color: TONE_COLOR[tone],
        display: 'grid',
        placeItems: 'center',
        '& svg': { fontSize: Math.round(size * 0.55) },
      }}
    >
      {children}
    </Box>
  );
}
