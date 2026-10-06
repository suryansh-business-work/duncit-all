import { useId, useState, type ReactNode } from 'react';
import { ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

export interface RowAction {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  destructive?: boolean;
  hidden?: boolean;
}

interface Props {
  /** The row's name, so the menu button reads "Actions for About us". */
  label: string;
  actions: RowAction[];
}

/** A row's actions behind one keyboard-reachable menu button. */
export default function RowActions({ label, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const visible = actions.filter((action) => !action.hidden);

  return (
    <>
      <DuncitIconButton
        size="small"
        aria-label={`${t('shell.common.actions')}: ${label}`}
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
