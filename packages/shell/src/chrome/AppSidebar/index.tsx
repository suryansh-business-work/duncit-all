import type { ReactNode } from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import type { AppNavItem } from '../../types';
import type { ShellUser } from '../user-display';
import { NavRail } from './NavRail';
import { NavTree } from './NavTree';
import { SidebarBrand } from './SidebarBrand';
import { SidebarUserCard } from './SidebarUserCard';

export interface AppSidebarProps {
  /** Portal short name shown next to the branding logo. */
  name: string;
  nav: AppNavItem[];
  /** Rendered under the branding, above the menu; hidden on the icon rail. */
  header?: ReactNode;
  user?: ShellUser;
  /** Sidebar footer caption (defaults to `© Duncit`). */
  footerCaption?: string;
  /** Called after a nav item is picked (closes the temporary drawer). */
  onNavigate?: () => void;
  /** Minimised to the icon rail: labels drop, and groups open in a popover. */
  collapsed?: boolean;
  /** Shows the minimise / expand control. Omitted on the temporary drawer,
   * which is already dismissed rather than minimised. */
  onToggleCollapse?: () => void;
}

/** The unified console sidebar: branding, menu, signed-in user, minimise control. */
export function AppSidebar({
  name,
  nav,
  header,
  user,
  footerCaption,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}: Readonly<AppSidebarProps>) {
  const { t } = useTranslation();
  const toggleLabel = collapsed ? t('shell.chrome.expandNav') : t('shell.chrome.collapseNav');
  return (
    <Stack sx={{ height: '100%' }}>
      <SidebarBrand name={name} collapsed={collapsed} onNavigate={onNavigate} />
      {header && !collapsed && (
        <Box sx={{ px: 1.25, pb: 1 }} data-testid="shell-sidebar-header">
          {header}
        </Box>
      )}
      {collapsed ? (
        <NavRail nav={nav} onNavigate={onNavigate} />
      ) : (
        <NavTree nav={nav} onNavigate={onNavigate} />
      )}
      <SidebarUserCard user={user} fallbackName={name} collapsed={collapsed} />
      <Box
        sx={{
          px: collapsed ? 1 : 1.5,
          py: 0.75,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          justifyContent: collapsed ? 'center' : 'space-between',
        }}
      >
        {!collapsed && (
          <Typography variant="caption" noWrap sx={{
            color: "text.secondary"
          }}>
            {footerCaption ?? '© Duncit'}
          </Typography>
        )}
        {onToggleCollapse && (
          <Tooltip title={toggleLabel} placement="right">
            <DuncitIconButton
              size="small"
              onClick={onToggleCollapse}
              aria-label={toggleLabel}
              aria-expanded={!collapsed}
              data-testid="shell-sidebar-collapse-toggle"
            >
              {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
            </DuncitIconButton>
          </Tooltip>
        )}
      </Box>
    </Stack>
  );
}
