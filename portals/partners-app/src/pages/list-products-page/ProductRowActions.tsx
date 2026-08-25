import { useState } from 'react';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import CampaignIcon from '@mui/icons-material/Campaign';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlined';
import { useTranslation } from '@duncit/shell';

export interface ProductRowAction {
  key: string;
  label: string;
  icon: 'edit' | 'settings' | 'ad' | 'delete' | 'pause' | 'resume';
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

const ICONS = {
  edit: <EditIcon fontSize="small" />,
  settings: <SettingsIcon fontSize="small" />,
  ad: <CampaignIcon fontSize="small" />,
  delete: <DeleteOutlineIcon fontSize="small" color="error" />,
  pause: <PauseCircleOutlineIcon fontSize="small" color="warning" />,
  resume: <PlayCircleOutlineIcon fontSize="small" color="success" />,
};

/** Per-row 3-dots menu. Lives in a MUI Menu portal, so item clicks never bubble
 * to the table's row-click. */
export default function ProductRowActions({ actions }: Readonly<{ actions: ProductRowAction[] }>) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  return (
    <>
      <IconButton size="small" aria-label={t('partners.listProductsPage.productActions')} onClick={(event) => setAnchor(event.currentTarget)}>
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
