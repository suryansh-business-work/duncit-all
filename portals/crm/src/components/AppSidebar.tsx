import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
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
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
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

/** Broadcast from the Expand-all / Collapse-all button: `nonce` forces groups to
 * re-sync their open state to `open` even after the user toggled them manually. */
type ExpandSignal = { open: boolean; nonce: number } | null;

interface NodeProps {
  item: AppNavItem;
  pathname: string;
  onNavigate?: () => void;
  expandAll?: ExpandSignal;
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

function GroupItem({ item, pathname, onNavigate, searching, expandAll }: Readonly<GroupItemProps>) {
  const active = useMemo(() => groupActive(pathname, item), [pathname, item]);
  const winner = useMemo(() => bestChild(pathname, item.children ?? []), [pathname, item.children]);
  const [open, setOpen] = useState(active);
  // Expand-all / Collapse-all re-syncs every group when its nonce changes.
  useEffect(() => {
    if (expandAll) setOpen(expandAll.open);
  }, [expandAll]);
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
              expandAll={expandAll}
              forceSelected={winner ? winner === child : undefined}
            />
          ))}
        </List>
      </Collapse>
    </Box>
  );
}

function NavNode({ item, pathname, onNavigate, forceSelected, searching, expandAll }: Readonly<NavNodeProps>) {
  if (item.children && item.children.length > 0) {
    return (
      <GroupItem
        item={item}
        pathname={pathname}
        onNavigate={onNavigate}
        searching={searching}
        expandAll={expandAll}
      />
    );
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
          <Typography variant="caption" color="text.secondary" sx={{ px: 1.5 }}>No menu items match.</Typography>
        ) : (
          nav.map((item) => (
            <NavNode key={item.label} item={item} pathname={location.pathname} onNavigate={onNavigate} searching={!!query.trim()} expandAll={expandAll} />
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
