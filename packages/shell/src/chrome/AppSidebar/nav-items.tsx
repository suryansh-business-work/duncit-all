import { useEffect, useMemo, useState } from 'react';
import { Box, Collapse, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { tokens } from '@duncit/theme';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { NavLink } from 'react-router';
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

const rowSx = { py: 0.5, px: 1.25, minHeight: tokens.size.navRow };
const leafSx = { ...rowSx, mb: 0.25 };

/** Row glyphs: muted, one size under body icons. The selected row's accent
 * icon comes from the theme's ListItemButton override. */
const navIconSx = {
  minWidth: 30,
  color: 'text.secondary',
  '& .MuiSvgIcon-root': { fontSize: tokens.size.icon.sm },
};

/** The group's open/closed chevron, quiet beside the label. */
const chevronSx = { fontSize: tokens.size.icon.sm, color: 'text.secondary' };

/** A `featured` leaf (e.g. Partners' "Earn with Duncit") renders as a
 * highlighted card: a soft accent wash, an accent edge and a caption line. */
const featuredLeafSx = {
  ...leafSx,
  mt: 0.5,
  mb: 0.75,
  py: 0.75,
  border: '1px solid',
  borderColor: 'primary.main',
  bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, tokens.state.selected),
  '& .MuiListItemIcon-root': { color: 'primary.main' },
};

function LeafItem({ item, pathname, onNavigate, forceSelected }: Readonly<LeafItemProps>) {
  const selected = forceSelected ?? matches(pathname, item.to);
  return (
    <ListItemButton
      component={NavLink}
      to={item.to ?? '#'}
      selected={selected}
      // NavLink marks every prefix match current, so `/host-leads` would claim
      // the page alongside `/host-leads/services`; the group's single winner
      // is the one page a screen reader should hear as current.
      aria-current={selected ? 'page' : false}
      onClick={onNavigate}
      data-testid="shell-nav-leaf"
      sx={item.featured ? featuredLeafSx : leafSx}
    >
      <ListItemIcon sx={navIconSx}>
        <AppIcon name={item.icon} fontSize="small" />
      </ListItemIcon>
      <ListItemText
        primary={item.label}
        secondary={item.featured ? item.caption : undefined}
        slotProps={{
          primary: { variant: 'body2', sx: { fontWeight: item.featured ? 'fontWeightBold' : 'fontWeightMedium' } },
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
      <ListItemButton
        onClick={() => setOpen((v) => !v)}
        aria-expanded={isOpen}
        data-testid="shell-nav-group"
        sx={rowSx}
      >
        <ListItemIcon sx={{ ...navIconSx, color: active ? 'primary.main' : 'text.secondary' }}>
          <AppIcon name={item.icon} fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          slotProps={{
            primary: {
              variant: 'body2',
              color: active ? 'primary.main' : 'inherit',
              sx: { fontWeight: active ? 'fontWeightBold' : 'fontWeightMedium' },
            },
          }}
        />
        {isOpen ? <ExpandLessIcon sx={chevronSx} /> : <ExpandMoreIcon sx={chevronSx} />}
      </ListItemButton>
      <Collapse in={isOpen} timeout="auto" unmountOnExit>
        {/* A guide line down the group's children, so nesting reads at a glance. */}
        <List disablePadding sx={{ ml: 2.25, pl: 0.75, borderLeft: 1, borderColor: 'divider' }}>
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
