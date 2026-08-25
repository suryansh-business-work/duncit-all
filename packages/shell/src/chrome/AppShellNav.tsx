import { useCallback } from 'react';
import { Box, Drawer } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { tokens } from '@duncit/theme';
import { useTranslation } from '../i18n/useTranslation';
import type { AppNavItem } from '../types';
import { AppSidebar } from './AppSidebar';
import { RAIL_WIDTH } from './AppSidebar/NavRail';
import type { ShellUser } from './user-display';
import { ABOVE_TASKBAR_HEIGHT, useWorkspace } from '../workspace';

const drawerWidth = tokens.size.drawerWidth;

/** The rail and the full sidebar are the same drawer at two widths, so the
 * page beside it slides rather than jumping a whole column. */
const slide = (theme: Theme) =>
  theme.transitions.create('width', { duration: theme.transitions.duration.shorter });

export interface AppShellNavProps {
  /** Portal short name shown next to the branding logo. */
  name: string;
  footerCaption?: string;
  nav: AppNavItem[];
  user?: ShellUser;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

/**
 * Both nav drawers: the temporary one below `md`, and the permanent one that
 * minimises to an icon rail.
 *
 * Its own component rather than a block inside AppShell because the minimised
 * flag lives in the workspace — the same place the Agent tab's position and the
 * taskbar's clock do, and for the same reason: it is how one person reads a
 * console, not how one browser happens to be set up, and there are seventeen of
 * them on seventeen origins. AppShell renders the provider, so it cannot read
 * it; this sits under it and can.
 */
export function AppShellNav({
  name,
  footerCaption,
  nav,
  user,
  mobileOpen,
  onCloseMobile,
}: Readonly<AppShellNavProps>) {
  const { t } = useTranslation();
  const workspace = useWorkspace();
  const collapsed = workspace?.sidebarCollapsed ?? false;
  const setCollapsed = workspace?.setSidebarCollapsed;
  const toggleCollapsed = useCallback(() => setCollapsed?.(!collapsed), [setCollapsed, collapsed]);
  const width = collapsed ? RAIL_WIDTH : drawerWidth;
  return (
    <Box
      component="nav"
      sx={{ width: { md: width }, flexShrink: { md: 0 }, transition: slide }}
      aria-label={t('shell.chrome.primaryNav')}
    >
      {/* Below `md` the sidebar is a sheet you dismiss, so it is never the rail:
          an icon-only menu you had to open first would be worse than the list. */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onCloseMobile}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: drawerWidth, height: ABOVE_TASKBAR_HEIGHT },
        }}
      >
        <AppSidebar
          name={name}
          nav={nav}
          user={user}
          footerCaption={footerCaption}
          onNavigate={onCloseMobile}
        />
      </Drawer>
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width,
            boxSizing: 'border-box',
            height: ABOVE_TASKBAR_HEIGHT,
            // The labels are still in the DOM while the paper narrows; without
            // this they push a scrollbar across the rail for the length of the
            // animation.
            overflowX: 'hidden',
            transition: slide,
          },
        }}
      >
        <AppSidebar
          name={name}
          nav={nav}
          user={user}
          footerCaption={footerCaption}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
      </Drawer>
    </Box>
  );
}
