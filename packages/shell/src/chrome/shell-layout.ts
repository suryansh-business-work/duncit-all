import type { SxProps, Theme } from '@mui/material/styles';
import { tokens } from '@duncit/theme';

/**
 * The console's two planes.
 *
 * The sidebar and the taskbar sit on the app ground; the header, breadcrumbs
 * and page sit on one content panel inset from it. From `md` up the panel has
 * its own hairline frame and rounded corners, so where the navigation ends and
 * the work begins is visible without a heavy divider. Below `md` the sidebar is
 * a sheet, so the panel runs edge to edge.
 */
export const CONTENT_PANEL_SX: SxProps<Theme> = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  bgcolor: 'background.paper',
  overflow: 'hidden',
  m: { md: `${tokens.size.panelInset}px` },
  ml: { md: 0 },
  border: { md: 1 },
  borderColor: { md: 'divider' },
  borderRadius: { md: `${tokens.radius.md}px` },
};

/** The permanent drawer paper: on the app ground, framed by the panel beside it. */
export const SIDEBAR_PAPER_SX = {
  bgcolor: 'background.default',
  borderRight: { md: 0 },
} as const;
