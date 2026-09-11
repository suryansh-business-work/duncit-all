import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Box, Divider } from '@mui/material';
import SectionHeader from '../../SectionHeader';
import { SURFACE_SX } from '../../../theme';

/**
 * A grouped list of menu rows: an optional section title, then one surface
 * card with a hairline between rows, inset 16 so it never touches the edges.
 * Absent children (a flag-gated row) simply drop out, divider and all. Native
 * twin: components/Sidebar/SidebarGroup.
 */
export default function MenuGroup({
  title,
  children,
}: Readonly<{ title?: string; children: ReactNode }>) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <Box sx={{ px: 2, pb: 1.5 }}>
      {title ? (
        <Box sx={{ mb: 1 }}>
          <SectionHeader title={title} />
        </Box>
      ) : null}
      <Box sx={{ ...SURFACE_SX, overflow: 'hidden' }}>
        {rows.map((row, index) => (
          <Fragment key={row.key}>
            {index > 0 ? <Divider sx={{ mx: 2 }} /> : null}
            {row}
          </Fragment>
        ))}
      </Box>
    </Box>
  );
}
