import { useState } from 'react';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';

interface Props {
  podTitle: string;
  onScan: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onCancel: () => void;
}

/** Every per-pod action behind one overflow button, so a row stays readable and
 * the destructive one is not a tap away from the rest. */
export default function HostPodActionsMenu({
  podTitle,
  onScan,
  onComplete,
  onEdit,
  onCancel,
}: Readonly<Props>) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const pick = (action: () => void) => () => {
    setAnchorEl(null);
    action();
  };

  return (
    <>
      <Tooltip title="Pod actions">
        <IconButton
          size="small"
          aria-label={`Actions for ${podTitle}`}
          onClick={(e) => setAnchorEl(e.currentTarget)}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={pick(onScan)}>
          <ListItemIcon>
            <QrCodeScannerIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText primary="Scan attendee event tickets" />
        </MenuItem>
        <MenuItem onClick={pick(onComplete)}>
          <ListItemIcon>
            <TaskAltIcon fontSize="small" color="success" />
          </ListItemIcon>
          <ListItemText primary="Complete pod" />
        </MenuItem>
        <MenuItem onClick={pick(onEdit)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Edit pod" />
        </MenuItem>
        <MenuItem onClick={pick(onCancel)} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <CancelIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primary="Cancel pod" />
        </MenuItem>
      </Menu>
    </>
  );
}
