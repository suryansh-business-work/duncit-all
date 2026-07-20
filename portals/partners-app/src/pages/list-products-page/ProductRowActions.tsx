import { useState } from 'react';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import CampaignIcon from '@mui/icons-material/Campaign';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

export interface ProductRowAction {
  key: string;
  label: string;
  icon: 'edit' | 'settings' | 'ad' | 'delete';
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

const ICONS = {
  edit: <EditIcon fontSize="small" />,
  settings: <SettingsIcon fontSize="small" />,
  ad: <CampaignIcon fontSize="small" />,
  delete: <DeleteOutlineIcon fontSize="small" color="error" />,
};

/** Per-row 3-dots menu. Lives in a MUI Menu portal, so item clicks never bubble
 * to the table's row-click. */
export default function ProductRowActions({ actions }: Readonly<{ actions: ProductRowAction[] }>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  return (
    <>
      <IconButton size="small" aria-label="Product actions" onClick={(event) => setAnchor(event.currentTarget)}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        {actions.map((action) => (
          <MenuItem
            key={action.key}
            disabled={action.disabled}
            onClick={() => {
              close();
              action.onClick();
            }}
            sx={action.danger ? { color: 'error.main' } : undefined}
          >
            <ListItemIcon>{ICONS[action.icon]}</ListItemIcon>
            <ListItemText>{action.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
