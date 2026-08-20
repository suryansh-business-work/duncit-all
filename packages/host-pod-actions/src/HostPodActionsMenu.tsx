import { useState } from 'react';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import FeedbackLinkItem from './FeedbackLinkItem';
import { useHostPodActionsConfig } from './HostPodActionsProvider';

interface Props {
  podTitle: string;
  /** Set on a completed/cancelled pod — the whole menu is then read-only. */
  disabled?: boolean;
  onScan: () => void;
  onComplete: () => void;
  /**
   * Opens the pod's attendance page. A PAGE, not a dialog — so, like
   * `onClubAdmin`, the item only appears where the surface has that route.
   */
  onSeeAttendance?: () => void;
  onEdit: () => void;
  onOpenFeedback: () => void;
  onShareFeedback: () => void;
  onCopyFeedback: () => void;
  onCancel: () => void;
  /**
   * Who runs this pod's club, and how to reach them. The card behind it is an
   * mWeb/native surface, so the item only appears where that surface exists —
   * a portal that passes nothing keeps the menu it had.
   */
  onClubAdmin?: () => void;
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
  onSeeAttendance,
  onEdit,
  onOpenFeedback,
  onShareFeedback,
  onCopyFeedback,
  onCancel,
  onClubAdmin,
}: Readonly<Props>) {
  const { labels } = useHostPodActionsConfig();
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
        {onSeeAttendance && (
          <MenuItem onClick={pick(onSeeAttendance)}>
            <ListItemIcon>
              <FactCheckIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText primary={labels.seeAttendance} />
          </MenuItem>
        )}
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
        {onClubAdmin && (
          <MenuItem onClick={pick(onClubAdmin)}>
            <ListItemIcon>
              <SupportAgentIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary={labels.clubAdmin} />
          </MenuItem>
        )}
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
