import { useEffect, useMemo, useState } from 'react';
import { Box, Collapse, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
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
      <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }} />
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

export function NavNode({ item, pathname, onNavigate, forceSelected, searching, expandAll }: Readonly<NavNodeProps>) {
  if (item.children && item.children.length > 0) {
    return (
      <GroupItem item={item} pathname={pathname} onNavigate={onNavigate} searching={searching} expandAll={expandAll} />
    );
  }
  return <LeafItem item={item} pathname={pathname} onNavigate={onNavigate} forceSelected={forceSelected} />;
}
