import { useCallback, useState } from 'react';
import { Divider, List, ListItemButton, ListItemIcon, Popover, Tooltip, Typography } from '@mui/material';
import { NavLink, useLocation } from 'react-router';
import type { AppNavItem } from '../../types';
import { AppIcon } from '../AppIcon';
import { groupActive, matches } from './helpers';
import { NavNode } from './nav-items';

/** The minimised sidebar's whole footprint — one icon, centred, plus its padding. */
export const RAIL_WIDTH = 72;

/** Which group is showing its children, and the icon they hang off. */
interface RailMenu {
  anchor: HTMLElement;
  item: AppNavItem;
}

const railItemSx = {
  minHeight: 42,
  mb: 0.5,
  borderRadius: 2,
  justifyContent: 'center',
  color: 'text.secondary',
  '& .MuiListItemIcon-root': { minWidth: 0, color: 'inherit' },
  '&.Mui-selected': {
    bgcolor: 'primary.main',
    color: 'primary.contrastText',
    '&:hover': { bgcolor: 'primary.dark' },
  },
};

interface RailItemProps {
  item: AppNavItem;
  pathname: string;
  onNavigate?: () => void;
  onOpenMenu: (anchor: HTMLElement, item: AppNavItem) => void;
}

/**
 * One icon on the rail.
 *
 * A group opens its children beside the rail rather than pushing them down it:
 * there is no room for a label at 72px, so a nested tree here would be a column
 * of icons with no way to tell what any of them belongs to. The tooltip is the
 * label, and it is what a screen reader announces — MUI puts a string `title`
 * on the child as its accessible name.
 */
function RailItem({ item, pathname, onNavigate, onOpenMenu }: Readonly<RailItemProps>) {
  const children = item.children ?? [];
  if (children.length > 0) {
    return (
      <Tooltip title={item.label} placement="right">
        <ListItemButton
          selected={groupActive(pathname, item)}
          onClick={(event) => onOpenMenu(event.currentTarget, item)}
          sx={railItemSx}
        >
          <ListItemIcon>
            <AppIcon name={item.icon} fontSize="small" />
          </ListItemIcon>
        </ListItemButton>
      </Tooltip>
    );
  }
  return (
    <Tooltip title={item.label} placement="right">
      <ListItemButton
        component={NavLink}
        to={item.to ?? '#'}
        selected={matches(pathname, item.to)}
        onClick={onNavigate}
        sx={railItemSx}
      >
        <ListItemIcon>
          <AppIcon name={item.icon} fontSize="small" />
        </ListItemIcon>
      </ListItemButton>
    </Tooltip>
  );
}

export interface NavRailProps {
  nav: AppNavItem[];
  /** Called after a nav item is picked (closes the temporary drawer). */
  onNavigate?: () => void;
}

/** The minimised sidebar: one icon per top-level entry, groups opening in a
 * popover beside the rail. */
export function NavRail({ nav, onNavigate }: Readonly<NavRailProps>) {
  const location = useLocation();
  const [menu, setMenu] = useState<RailMenu | null>(null);
  const openMenu = useCallback(
    (anchor: HTMLElement, item: AppNavItem) => setMenu({ anchor, item }),
    []
  );
  const closeMenu = useCallback(() => setMenu(null), []);
  // Picking a page inside the popover closes it — leaving it open over the page
  // it just navigated to is a menu that has to be dismissed twice.
  const pick = useCallback(() => {
    setMenu(null);
    onNavigate?.();
  }, [onNavigate]);
  return (
    <>
      <List sx={{ px: 1, py: 1, flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {nav.map((item) => (
          <RailItem
            key={item.label}
            item={item}
            pathname={location.pathname}
            onNavigate={onNavigate}
            onOpenMenu={openMenu}
          />
        ))}
      </List>
      <Popover
        open={menu !== null}
        anchorEl={menu?.anchor ?? null}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { ml: 1, width: 264, maxHeight: '70vh' } } }}
      >
        <Typography
          variant="overline"
          noWrap
          sx={{ display: 'block', px: 2, pt: 1.5, color: 'text.secondary', fontWeight: 800 }}
        >
          {menu?.item.label}
        </Typography>
        <Divider sx={{ mt: 0.5 }} />
        <List sx={{ px: 1, py: 1 }}>
          {(menu?.item.children ?? []).map((child) => (
            <NavNode key={child.label} item={child} pathname={location.pathname} onNavigate={pick} />
          ))}
        </List>
      </Popover>
    </>
  );
}
