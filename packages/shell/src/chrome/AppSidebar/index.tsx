import { useMemo, useState } from 'react';
import { Box, Button, InputAdornment, List, Skeleton, Stack, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { NavLink, useLocation } from 'react-router-dom';
import { tokens } from '@duncit/theme';
import type { AppNavItem } from '../../types';
import { useBranding } from '../../hooks/useBranding';
import type { ShellUser } from '../user-display';
import { filterNav } from './helpers';
import { NavNode, type ExpandSignal } from './nav-items';
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
}

/** The unified console sidebar: branding, menu search, nav tree, signed-in user. */
export function AppSidebar({ name, nav: navItems, user, footerCaption, onNavigate }: Readonly<AppSidebarProps>) {
  const location = useLocation();
  const { logoUrl, appName, loading } = useBranding();
  const [query, setQuery] = useState('');
  const nav = useMemo(() => filterNav(navItems, query.trim()), [navItems, query]);
  // Expand-all / Collapse-all toggle: `allOpen` flips the label; `expandAll`
  // carries a nonce so every group re-syncs even after manual toggling.
  const [allOpen, setAllOpen] = useState(false);
  const [expandAll, setExpandAll] = useState<ExpandSignal>(null);
  const toggleAll = () => {
    const open = !allOpen;
    setAllOpen(open);
    setExpandAll({ open, nonce: Date.now() });
  };
  return (
    <Stack sx={{ height: '100%' }}>
      <Box
        component={NavLink}
        to="/"
        onClick={onNavigate}
        aria-label="Go to home"
        sx={{
          minHeight: tokens.size.headerHeight,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          borderBottom: 1,
          borderColor: 'divider',
          textDecoration: 'none',
          color: 'inherit',
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        {loading ? (
          <Skeleton variant="rounded" width={96} height={24} />
        ) : (
          <Box
            component="img"
            src={logoUrl}
            alt={appName}
            sx={{ height: 26, width: 'auto', maxWidth: 130, objectFit: 'contain' }}
          />
        )}
        <Typography variant="caption" color="primary" fontWeight={800} sx={{ letterSpacing: 0.3 }} noWrap>
          {name}
        </Typography>
      </Box>
      <Box sx={{ px: 1.5, pt: 1.5, pb: 0.5 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search menu…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Button
          size="small"
          fullWidth
          onClick={toggleAll}
          startIcon={allOpen ? <UnfoldLessIcon fontSize="small" /> : <UnfoldMoreIcon fontSize="small" />}
          sx={{ mt: 0.75, justifyContent: 'flex-start', color: 'text.secondary', fontWeight: 700 }}
        >
          {allOpen ? 'Collapse all' : 'Expand all'}
        </Button>
      </Box>
      <List sx={{ px: 1, py: 1, flex: 1, overflowY: 'auto' }}>
        {nav.length === 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ px: 1.5 }}>
            No menu items match.
          </Typography>
        ) : (
          nav.map((item) => (
            <NavNode
              key={item.label}
              item={item}
              pathname={location.pathname}
              onNavigate={onNavigate}
              searching={!!query.trim()}
              expandAll={expandAll}
            />
          ))
        )}
      </List>
      <SidebarUserCard user={user} fallbackName={name} />
      <Box sx={{ px: 2, py: 1.25, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" noWrap>
          {footerCaption ?? '© Duncit'}
        </Typography>
      </Box>
    </Stack>
  );
}
