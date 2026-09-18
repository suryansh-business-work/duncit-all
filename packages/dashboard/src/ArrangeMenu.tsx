import { useState, type MouseEvent } from 'react';
import { ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import WidthWideIcon from '@mui/icons-material/WidthWide';
import WidthNormalIcon from '@mui/icons-material/WidthNormal';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import { DuncitIconButton } from '@duncit/buttons';
import { ARRANGE_ACTIONS, type ArrangeAction } from './layout';
import type { DashboardArrange, DashboardWidget } from './types';

const ICONS: Readonly<Record<ArrangeAction, typeof ArrowUpwardIcon>> = {
  earlier: ArrowUpwardIcon,
  later: ArrowDownwardIcon,
  wider: WidthWideIcon,
  narrower: WidthNormalIcon,
  taller: UnfoldMoreIcon,
  shorter: UnfoldLessIcon,
};

export type ArrangeMenuProps = Readonly<{
  widget: DashboardWidget;
  arrange: DashboardArrange;
}>;

/**
 * Move and resize a widget without dragging it (WCAG 2.5.7 Dragging Movements,
 * 2.1.1 Keyboard): one button per widget while editing, opening the moves that
 * would change something right now. What it can do is read when it OPENS,
 * because GridStack — not React — owns where the widgets currently sit.
 *
 * A real button is safe inside the drag handle: GridStack's skip list refuses
 * to start a drag from one, which is also what keeps `headerActions` clickable.
 */
export function ArrangeMenu({ widget, arrange }: ArrangeMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [available, setAvailable] = useState<ReadonlySet<ArrangeAction>>(() => new Set());
  const menuId = `dashboard-arrange-menu-${widget.id}`;

  const open = (event: MouseEvent<HTMLElement>) => {
    setAvailable(new Set(arrange.available(widget)));
    setAnchor(event.currentTarget);
  };
  const close = () => setAnchor(null);
  const choose = (action: ArrangeAction) => {
    close();
    arrange.apply(widget, action);
  };

  return (
    <>
      <DuncitIconButton
        size="small"
        aria-label={arrange.buttonLabel(widget.title)}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        aria-controls={anchor ? menuId : undefined}
        data-testid={`dashboard-arrange-${widget.id}`}
        onClick={open}
      >
        <OpenWithIcon fontSize="small" />
      </DuncitIconButton>
      <Menu id={menuId} anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        {ARRANGE_ACTIONS.map((action) => {
          const Icon = ICONS[action];
          return (
            <MenuItem
              key={action}
              disabled={!available.has(action)}
              data-testid={`dashboard-arrange-${action}`}
              onClick={() => choose(action)}
            >
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{arrange.labels[action]}</ListItemText>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
