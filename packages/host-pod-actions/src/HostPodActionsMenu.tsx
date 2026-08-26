import { useState } from 'react';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import StarRateIcon from '@mui/icons-material/StarRate';
import PhotoCameraBackIcon from '@mui/icons-material/PhotoCameraBack';
import PodLinkMenuItem from './PodLinkMenuItem';
import { useHostPodActionsConfig } from './HostPodActionsProvider';

interface Props {
  podTitle: string;
  /** Set on a completed/cancelled pod — the whole menu is then read-only. */
  disabled?: boolean;
  /**
   * The venue refused this pod's slot, so it never ran and never sold a seat.
   * Scanning tickets, marking attendance, completing it and asking guests to
   * rate it are all meaningless then — the host resubmits or cancels instead.
   */
  venueRejected?: boolean;
  /**
   * The pod has ended. Completion is the settlement — it prices the payout off
   * the seats scanned in — so it is offered on a PAST pod only: an upcoming or
   * ongoing pod would freeze the answer while the door is still open.
   */
  canComplete?: boolean;
  onScan: () => void;
  onComplete: () => void;
  /**
   * Opens the pod's attendance page. A PAGE, not a dialog — so, like
   * `onClubAdmin`, the item only appears where the surface has that route.
   */
  onSeeAttendance?: () => void;
  /**
   * Opens the pod's "Slot Request Sent" page — where the venue's decision on
   * this pod's slot is shown, and can be re-checked. A PAGE like
   * `onSeeAttendance`, so it only appears where the surface has that route.
   */
  onSlotRequest?: () => void;
  onEdit: () => void;
  /**
   * The pod's media upload page and the link to it. A PAGE like
   * `onSeeAttendance`, so the three appear together only where the surface has
   * that route — a console that passes nothing keeps the menu it had.
   */
  onOpenPodMedia?: () => void;
  onSharePodMedia?: () => void;
  onCopyPodMedia?: () => void;
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
  venueRejected = false,
  canComplete = false,
  onScan,
  onComplete,
  onSeeAttendance,
  onSlotRequest,
  onEdit,
  onOpenPodMedia,
  onSharePodMedia,
  onCopyPodMedia,
  onOpenFeedback,
  onShareFeedback,
  onCopyFeedback,
  onCancel,
  onClubAdmin,
}: Readonly<Props>) {
  const { labels, podMediaLabels } = useHostPodActionsConfig();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const pick = (action: () => void) => () => {
    setAnchorEl(null);
    action();
  };

  // The actions that only make sense for a pod that actually gets to run.
  const showAttendeeActions = !venueRejected;

  return (
    <>
      <Tooltip title={labels.menuTooltip}>
        <span>
          <IconButton
            size="small"
            disabled={disabled}
            aria-label={labels.menuAria(podTitle)}
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
        {showAttendeeActions && (
          <MenuItem onClick={pick(onScan)}>
            <ListItemIcon>
              <QrCodeScannerIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary={labels.scanTickets} />
          </MenuItem>
        )}
        {showAttendeeActions && onSeeAttendance && (
          <MenuItem onClick={pick(onSeeAttendance)}>
            <ListItemIcon>
              <FactCheckIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText primary={labels.seeAttendance} />
          </MenuItem>
        )}
        {onSlotRequest && (
          <MenuItem onClick={pick(onSlotRequest)}>
            <ListItemIcon>
              <PendingActionsIcon fontSize="small" color="warning" />
            </ListItemIcon>
            <ListItemText primary={labels.slotRequest} />
          </MenuItem>
        )}
        {showAttendeeActions && canComplete && (
          <MenuItem onClick={pick(onComplete)}>
            <ListItemIcon>
              <TaskAltIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText primary={labels.completePod} />
          </MenuItem>
        )}
        <MenuItem onClick={pick(onEdit)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={labels.editPod} />
        </MenuItem>
        {/* The pod's two links, each one row: clicking it opens the page, and
            the two icons beside it hand THE SAME link to the people who came —
            Share and Copy resolve one address per pod, never two. */}
        {showAttendeeActions && onOpenPodMedia && onSharePodMedia && onCopyPodMedia && (
          <PodLinkMenuItem
            icon={<PhotoCameraBackIcon fontSize="small" color="primary" />}
            label={podMediaLabels.pageTitle}
            shareLabel={podMediaLabels.shareLink}
            copyLabel={podMediaLabels.copyLink}
            onOpen={pick(onOpenPodMedia)}
            onShare={pick(onSharePodMedia)}
            onCopy={pick(onCopyPodMedia)}
          />
        )}
        {showAttendeeActions && (
          <PodLinkMenuItem
            icon={<StarRateIcon fontSize="small" sx={{ color: 'warning.main' }} />}
            label={labels.feedbackLink}
            shareLabel={labels.shareLink}
            copyLabel={labels.copyLink}
            onOpen={pick(onOpenFeedback)}
            onShare={pick(onShareFeedback)}
            onCopy={pick(onCopyFeedback)}
          />
        )}
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
          <ListItemText primary={labels.cancelPod} />
        </MenuItem>
      </Menu>
    </>
  );
}
