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
      {collapsed ? (
        <NavRail nav={nav} onNavigate={onNavigate} />
      ) : (
        <NavTree nav={nav} onNavigate={onNavigate} />
      )}
      <SidebarUserCard user={user} fallbackName={name} collapsed={collapsed} />
      <Box
        sx={{
          px: collapsed ? 1 : 2,
          py: 1,
          borderTop: 1,
          borderColor: 'divider',
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
            <DuncitIconButton size="small" onClick={onToggleCollapse}>
              {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
            </DuncitIconButton>
          </Tooltip>
        )}
      </Box>
    </Stack>
  );
}
