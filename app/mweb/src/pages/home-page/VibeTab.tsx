import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

type IconPosition = 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';

/** A category's admin icon layout (Category catalogue). Still carried on the
 * category data; the calm chips draw every icon in the same 24px circle. */
export interface IconLayout {
  position: IconPosition;
  width: number;
  height: number;
}

interface VibeTabProps {
  label: string;
  icon: ReactNode;
  selected: boolean;
  onClick: () => void;
}

/** A top-level category chip: a surface pill with the category's icon in a
 * small circle at the left; selected = the green primary fill. Native twin:
 * VibeCategoryTab. */
export default function VibeTab({ label, icon, selected, onClick }: Readonly<VibeTabProps>) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        flex: '0 0 auto',
        height: 40,
        minHeight: 40,
        pl: 1,
        pr: 1.75,
        borderRadius: 999,
        border: '1px solid',
        borderColor: selected ? 'primary.main' : 'var(--duncit-card-border)',
        bgcolor: selected ? 'primary.main' : 'background.paper',
        color: selected ? 'primary.contrastText' : 'text.primary',
        font: 'inherit',
        cursor: 'pointer',
        transition: 'background-color 160ms ease, color 160ms ease',
      }}
    >
      <Box
        component="span"
        sx={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          overflow: 'hidden',
          flex: '0 0 auto',
          display: 'grid',
          placeItems: 'center',
          bgcolor: selected ? 'background.paper' : 'action.hover',
          color: 'text.primary',
          // An admin image fills the circle rather than floating inside it.
          '& img': { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 0 },
        }}
      >
        {icon}
      </Box>
      <Typography component="span" noWrap sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, color: 'inherit' }}>
        {label}
      </Typography>
    </Box>
  );
}
