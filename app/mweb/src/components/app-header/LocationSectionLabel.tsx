import type { ReactNode } from 'react';
import { Typography } from '@mui/material';

/** A group label inside the location sheet (Country, State, City, Area, Map):
 * small muted caps, the same on every group. Native twin:
 * components/LocationDialog/SectionLabel. */
export default function LocationSectionLabel({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Typography
      variant="overline"
      sx={{ display: 'block', color: 'text.secondary', fontWeight: 600, lineHeight: 1.4, mb: 1 }}
    >
      {children}
    </Typography>
  );
}
