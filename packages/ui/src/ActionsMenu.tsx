import { useId, useState, type ReactNode } from 'react';
import { ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { DuncitIconButton } from '@duncit/buttons';

export interface ActionsMenuItem {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  /** Painted in the error colour (delete, remove). */
  destructive?: boolean;
  /** Shown but not choosable (e.g. while a save runs). */
  disabled?: boolean;
  /** Left out of the menu entirely. */
  hidden?: boolean;
}

export interface ActionsMenuProps {
  /** The menu button's accessible name, already translated ("Actions for About us"). */
  buttonLabel: string;
  actions: ActionsMenuItem[];
}

/**
 * A row's or a card's actions behind one keyboard-reachable "more" button —
 * the overflow menu the portals' tables, CMS rows and image tiles share. The
 * menu closes before an action runs, so an action that opens a dialog gets
 * focus back cleanly.
 */
export function ActionsMenu({ buttonLabel, actions }: Readonly<ActionsMenuProps>) {
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const visible = actions.filter((action) => !action.hidden);

  return (
    <>
      <DuncitIconButton
        size="small"
        aria-label={buttonLabel}
        aria-haspopup="menu"
        aria-controls={anchor ? menuId : undefined}
        aria-expanded={anchor ? 'true' : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <MoreVertIcon fontSize="small" />
      </DuncitIconButton>
      <Menu id={menuId} anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {visible.map((action) => (
          <MenuItem
            key={action.key}
            disabled={action.disabled}
            onClick={() => {
              setAnchor(null);
              action.onClick();
            }}
            sx={action.destructive ? { color: 'error.main' } : undefined}
          >
            <ListItemIcon sx={action.destructive ? { color: 'error.main' } : undefined}>{action.icon}</ListItemIcon>
            <ListItemText>{action.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
