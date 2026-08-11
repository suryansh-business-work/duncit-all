import { useState } from 'react';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import FeedbackLinkItem from './FeedbackLinkItem';

interface Props {
  podTitle: string;
  /** Set on a completed/cancelled pod — the whole menu is then read-only. */
  disabled?: boolean;
  onScan: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onOpenFeedback: () => void;
  onShareFeedback: () => void;
  onCopyFeedback: () => void;
  onCancel: () => void;
}

/**
 * Every per-pod action behind one overflow button, so a row stays readable and
 * the destructive one is not a click away from the rest.
 *
 * The same five actions the native app shows in its PodActionsSheet (rule 27).
 */
export default function HostPodActionsMenu({
  podTitle,
  disabled = false,
  onScan,
  onComplete,
  onEdit,
  onOpenFeedback,
  onShareFeedback,
  onCopyFeedback,
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
        <span>
          <IconButton
            size="small"
            disabled={disabled}
            aria-label={`Actions for ${podTitle}`}
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </span>
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
        {/* The rating link: clicking the row opens the form, and the two icons
            beside it hand the link to the people who came. */}
        <FeedbackLinkItem
          onOpen={pick(onOpenFeedback)}
          onShare={pick(onShareFeedback)}
          onCopy={pick(onCopyFeedback)}
        />
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
