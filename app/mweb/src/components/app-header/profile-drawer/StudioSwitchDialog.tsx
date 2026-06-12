import { JSX } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Radio,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorefrontIcon from '@mui/icons-material/Storefront';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { availableModes, type StudioMode } from '../../../studio-mode';

const ICONS: Record<StudioMode, JSX.Element> = {
  USER: <PersonIcon />,
  HOST: <DashboardIcon />,
  VENUE: <StorefrontIcon />,
  ECOMM: <Inventory2Icon />,
};

interface Props {
  open: boolean;
  roles: string[];
  current: StudioMode;
  onClose: () => void;
  onSelect: (mode: StudioMode) => void;
}

/** Picks the active studio mode from the modes the signed-in user qualifies for. */
export default function StudioSwitchDialog({ open, roles, current, onClose, onSelect }: Readonly<Props>) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="studio-switch-title">
      <DialogTitle id="studio-switch-title" sx={{ fontWeight: 900 }}>
        Switch role
      </DialogTitle>
      <DialogContent>
        <List>
          {availableModes(roles).map((option) => (
            <ListItemButton
              key={option.mode}
              selected={option.mode === current}
              onClick={() => onSelect(option.mode)}
              sx={{ borderRadius: 2 }}
            >
              <ListItemIcon sx={{ color: 'primary.main' }}>{ICONS[option.mode]}</ListItemIcon>
              <ListItemText primary={option.label} primaryTypographyProps={{ fontWeight: 800 }} />
              <Radio checked={option.mode === current} tabIndex={-1} />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
