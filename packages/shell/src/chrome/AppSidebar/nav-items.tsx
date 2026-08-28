import { useEffect, useMemo, useState } from 'react';
import { Box, Collapse, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { NavLink } from 'react-router-dom';
import type { AppNavItem } from '../../types';
import { AppIcon } from '../AppIcon';
import { bestChild, groupActive, matches } from './helpers';

/** Broadcast from the Expand-all / Collapse-all button: `nonce` forces groups to
 * re-sync their open state to `open` even after the user toggled them manually. */
export type ExpandSignal = { open: boolean; nonce: number } | null;

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

const leafSx = {
  mb: 0.25,
  py: 0.75,
  '&.Mui-selected': {
    bgcolor: 'primary.main',
    color: 'primary.contrastText',
    '& .MuiListItemIcon-root': { color: 'inherit' },
  },
};

/** A `featured` leaf (e.g. Partners' "Earn with Duncit") renders as a
 * highlighted card: primary gradient wash, primary border and a caption line. */
const featuredLeafSx = {
  ...leafSx,
  mt: 0.25,
  mb: 0.75,
  borderRadius: 2,
  border: '1px solid',
  borderColor: 'primary.main',
  background: (theme: Theme) =>
    `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.18)} 0%, ${alpha(theme.palette.primary.main, 0.04)} 100%)`,
  '& .MuiListItemIcon-root': { color: 'primary.main' },
  '&.Mui-selected': {
    bgcolor: 'primary.main',
    color: 'primary.contrastText',
    '& .MuiListItemIcon-root': { color: 'inherit' },
    '& .MuiListItemText-secondary': { color: 'inherit', opacity: 0.85 },
  },
};

function LeafItem({ item, pathname, onNavigate, forceSelected }: Readonly<LeafItemProps>) {
  const selected = forceSelected ?? matches(pathname, item.to);
  return (
    <ListItemButton
      component={NavLink}
      to={item.to ?? '#'}
      selected={selected}
      onClick={onNavigate}
      sx={item.featured ? featuredLeafSx : leafSx}
    >
      <ListItemIcon sx={{ minWidth: 34, color: 'text.secondary' }}>
        <AppIcon name={item.icon} fontSize="small" />
      </ListItemIcon>
      <ListItemText
        primary={item.label}
        secondary={item.featured ? item.caption : undefined}
        slotProps={{
          primary: { variant: 'body2', sx: { fontWeight: item.featured ? 800 : 600 } },
          secondary: { variant: 'caption' }
        }} />
    </ListItemButton>
  );
}

function GroupItem({ item, pathname, onNavigate, searching, expandAll }: Readonly<GroupItemProps>) {
  // NavNode only renders a GroupItem once it has confirmed `item.children` is
  // a non-empty array — safe to treat it as always present here.
  const children = item.children!;
  const active = useMemo(() => groupActive(pathname, item), [pathname, item]);
  const winner = useMemo(() => bestChild(pathname, children), [pathname, children]);
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
          slotProps={{
            primary: { variant: 'body2', color: active ? 'primary.main' : 'inherit', sx: { fontWeight: active ? 800 : 600 } }
          }}
        />
        {isOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </ListItemButton>
      <Collapse in={isOpen} timeout="auto" unmountOnExit>
        <List disablePadding sx={{ pl: 2 }}>
          {children.map((child) => (
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

export function NavNode({ item, pathname, onNavigate, forceSelected, searching, expandAll }: Readonly<NavNodeProps>) {
  if (item.children && item.children.length > 0) {
    return (
      <GroupItem item={item} pathname={pathname} onNavigate={onNavigate} searching={searching} expandAll={expandAll} />
    );
  }
  return <LeafItem item={item} pathname={pathname} onNavigate={onNavigate} forceSelected={forceSelected} />;
}
