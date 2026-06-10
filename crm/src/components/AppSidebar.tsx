import { useMemo, useState } from 'react';
import {
  Box,
  Collapse,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import { NavLink, useLocation } from 'react-router-dom';
import { appConfig, type AppNavItem } from '../config/app-config';
import { useBranding } from '../lib/useBranding';
import AppIcon from './AppIcon';
import { HEADER_HEIGHT } from './AppShell';
import { bestChild, groupActive, matches } from './AppSidebar.helpers';

interface SidebarProps {
  onNavigate?: () => void;
}

interface NodeProps {
  item: AppNavItem;
  pathname: string;
  onNavigate?: () => void;
}

interface LeafItemProps extends NodeProps {
  /**
   * When a leaf sits inside a group, the group picks a single "winner" child
   * via longest-prefix match and forces selection on that one. Prevents two
   * siblings (e.g. `/host-leads` and `/host-leads/services`) lighting up
   * together for the more specific URL.
   */
  forceSelected?: boolean;
}

interface GroupItemProps extends NodeProps {
  /** When a search is active, groups are force-expanded so matches are visible. */
  searching?: boolean;
}

interface NavNodeProps extends LeafItemProps, GroupItemProps {}

function LeafItem({ item, pathname, onNavigate, forceSelected }: Readonly<LeafItemProps>) {
  const selected = forceSelected ?? matches(pathname, item.to);
  return (
    <ListItemButton
      component={NavLink}
      to={item.to ?? '#'}
      selected={selected}
      onClick={onNavigate}
      sx={{
        mb: 0.25,
        py: 0.75,
        '&.Mui-selected': {
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          '& .MuiListItemIcon-root': { color: 'inherit' },
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 34, color: 'text.secondary' }}>
        <AppIcon name={item.icon} fontSize="small" />
      </ListItemIcon>
      <ListItemText
        primary={item.label}
        primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
      />
    </ListItemButton>
  );
}

function GroupItem({ item, pathname, onNavigate, searching }: Readonly<GroupItemProps>) {
  const active = useMemo(() => groupActive(pathname, item), [pathname, item]);
  const winner = useMemo(() => bestChild(pathname, item.children ?? []), [pathname, item.children]);
  const [open, setOpen] = useState(active);
  const isOpen = searching ? true : open;
  return (
    <Box sx={{ mb: 0.25 }}>
      <ListItemButton onClick={() => setOpen((v) => !v)} sx={{ py: 0.75 }}>
        <ListItemIcon sx={{ minWidth: 34, color: active ? 'primary.main' : 'text.secondary' }}>
          <AppIcon name={item.icon} fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{
            fontWeight: active ? 800 : 600,
            variant: 'body2',
            color: active ? 'primary.main' : 'inherit',
          }}
        />
        {isOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </ListItemButton>
      <Collapse in={isOpen} timeout="auto" unmountOnExit>
        <List disablePadding sx={{ pl: 2 }}>
          {(item.children ?? []).map((child) => (
            <NavNode
              key={child.label}
              item={child}
              pathname={pathname}
              onNavigate={onNavigate}
              searching={searching}
              forceSelected={winner ? winner === child : undefined}
            />
          ))}
        </List>
      </Collapse>
    </Box>
  );
}

function NavNode({ item, pathname, onNavigate, forceSelected, searching }: Readonly<NavNodeProps>) {
  if (item.children && item.children.length > 0) {
    return <GroupItem item={item} pathname={pathname} onNavigate={onNavigate} searching={searching} />;
  }
  return (
    <LeafItem item={item} pathname={pathname} onNavigate={onNavigate} forceSelected={forceSelected} />
  );
}

/** Filter nav by query: keep a group if its label matches (whole subtree) or any descendant matches. */
function filterNav(items: AppNavItem[], q: string): AppNavItem[] {
  if (!q) return items;
  const ql = q.toLowerCase();
  return items.flatMap((item) => {
    if (item.label.toLowerCase().includes(ql)) return [item];
    const kids = filterNav(item.children ?? [], ql);
    return kids.length ? [{ ...item, children: kids }] : [];
  });
}

export default function AppSidebar({ onNavigate }: Readonly<SidebarProps>) {
  const location = useLocation();
  const { logoUrl, appName, loading } = useBranding();
  const [query, setQuery] = useState('');
  const nav = useMemo(() => filterNav(appConfig.nav, query.trim()), [query]);
  return (
    <Stack sx={{ height: '100%' }}>
      <Box
        sx={{
          minHeight: HEADER_HEIGHT,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          borderBottom: 1,
          borderColor: 'divider',
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
          {appConfig.name}
        </Typography>
      </Box>
      <Box sx={{ px: 1.5, pt: 1.5, pb: 0.5 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search menu…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
      </Box>
      <List sx={{ px: 1, py: 1, flex: 1, overflowY: 'auto' }}>
        {nav.length === 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ px: 1.5 }}>No menu items match.</Typography>
        ) : (
          nav.map((item) => (
            <NavNode key={item.label} item={item} pathname={location.pathname} onNavigate={onNavigate} searching={!!query.trim()} />
          ))
        )}
      </List>
      <Box sx={{ px: 2, py: 1.25, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" noWrap>
          {appConfig.fullName}
        </Typography>
      </Box>
    </Stack>
  );
}
