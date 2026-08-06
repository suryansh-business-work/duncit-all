import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { AppBar, Box, IconButton, Toolbar, Tooltip, Typography } from '@mui/material';
import AppsIcon from '@mui/icons-material/Apps';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import { tokens, useColorMode } from '@duncit/theme';
import type { AppNavItem, SearchItem } from '../types';
import { StaffChatButton } from '../staff-chat/StaffChatButton';
import { STAFF_CHAT_ROLES } from '../staff-chat/roles';
import { AppsDrawer } from './AppsDrawer';
import type { ShellTool } from './AppsDrawer/tools';
import { HeaderSearch } from './HeaderSearch';
import { UserMenu } from './UserMenu';
import type { ShellUser } from './user-display';

export interface AppHeaderProps {
  /** Header brand title linking to '/'. */
  title: string;
  /** Portal short name — avatar/initials fallback. */
  name: string;
  nav: AppNavItem[];
  searchItems?: SearchItem[];
  user?: ShellUser;
  profileTo?: string;
  onLogout: () => void;
  /** Opens the temporary drawer below the md breakpoint. */
  onOpenMobileNav: () => void;
  /** Portal-specific entries for the apps drawer, alongside the platform's own. */
  tools?: ShellTool[];
}

/** The unified console AppBar: hamburger, brand, global search, mode toggle, account. */
export function AppHeader({
  title,
  name,
  nav,
  searchItems,
  user,
  profileTo,
  onLogout,
  onOpenMobileNav,
  tools,
}: Readonly<AppHeaderProps>) {
  const colorMode = useColorMode();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  // Only people who can sign into a staff console have coworkers to chat with,
  // and the server refuses the query to anyone else — so it is not asked.
  const isStaff = (user?.roles ?? []).some((role) => STAFF_CHAT_ROLES.has(role));

  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar sx={{ minHeight: `${tokens.size.headerHeight}px !important`, gap: 1, px: { xs: 1.25, sm: 2 } }}>
        {mobileSearchOpen ? (
          <>
            <IconButton size="small" edge="start" onClick={() => setMobileSearchOpen(false)} aria-label="close search">
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <HeaderSearch
                items={searchItems}
                nav={nav}
                autoFocus
                disableSlashShortcut
                onNavigated={() => setMobileSearchOpen(false)}
              />
            </Box>
          </>
        ) : (
          <>
            <IconButton
              size="small"
              edge="start"
              onClick={onOpenMobileNav}
              aria-label="open navigation"
              sx={{ display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Box component={RouterLink} to="/" sx={{ color: 'inherit', textDecoration: 'none', minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={800} noWrap>
                {title}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, display: { xs: 'none', sm: 'flex' }, justifyContent: 'center' }}>
              <HeaderSearch items={searchItems} nav={nav} />
            </Box>
            <Box sx={{ flex: 1, display: { xs: 'block', sm: 'none' } }} />
            <IconButton
              size="small"
              onClick={() => setMobileSearchOpen(true)}
              aria-label="open search"
              sx={{ display: { sm: 'none' } }}
            >
              <SearchIcon fontSize="small" />
            </IconButton>
            {isStaff && <StaffChatButton meId={user?.id} />}
            <Tooltip title="Apps">
              <IconButton size="small" onClick={() => setAppsOpen(true)} aria-label="open apps">
                <AppsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={`Switch to ${colorMode.mode === 'light' ? 'dark' : 'light'} mode`}>
              <IconButton size="small" onClick={colorMode.toggle} aria-label="toggle color mode">
                {colorMode.mode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <UserMenu user={user} fallbackName={name} profileTo={profileTo} onLogout={onLogout} />
          </>
        )}
      </Toolbar>
      <AppsDrawer
        open={appsOpen}
        onClose={() => setAppsOpen(false)}
        extraTools={tools}
        roles={user?.roles}
        meId={user?.id}
      />
    </AppBar>
  );
}
