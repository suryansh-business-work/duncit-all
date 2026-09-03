import { ListItemIcon, ListItemText, MenuItem } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import StarRateIcon from '@mui/icons-material/StarRate';
import PhotoCameraBackIcon from '@mui/icons-material/PhotoCameraBack';
import PodLinkMenuItem from './PodLinkMenuItem';
import { useHostPodActionsConfig } from './HostPodActionsProvider';

/**
 * The rows inside the host's overflow menu.
 *
 * Split out of `HostPodActionsMenu` when the menu passed the 200-line ceiling
 * (rule 9): the parent is now the button, the anchor and the popover, and this
 * is what goes inside it. Behaviour is unchanged — every item, and every
 * condition guarding it, moved across verbatim.
 */
export interface HostPodMenuItemsProps {
  /** Hides everything that only makes sense for a pod that gets to run. */
  showAttendeeActions: boolean;
  canComplete: boolean;
  /** Closes the menu, then runs the action. */
  pick: (action: () => void) => () => void;
  onScan: () => void;
  onComplete: () => void;
  onSeeAttendance?: () => void;
  onSlotRequest?: () => void;
  onEdit: () => void;
  onOpenPodMedia?: () => void;
  onSharePodMedia?: () => void;
  onCopyPodMedia?: () => void;
  onOpenFeedback: () => void;
  onShareFeedback: () => void;
  onCopyFeedback: () => void;
  onCancel: () => void;
  onClubAdmin?: () => void;
  /** "Request Change Host" — asks Duncit for a different host rather than
   * cancelling the pod. Only appears where the surface passes it. */
  onRequestChange?: () => void;
  /** Already-translated, because the label lives in `changeRequest.*` — a
   * namespace this package's own labels deliberately do not reach into. */
  requestChangeLabel?: string;
}

export default function HostPodActionsItems({
  showAttendeeActions,
  canComplete,
  pick,
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
  onRequestChange,
  requestChangeLabel,
}: Readonly<HostPodMenuItemsProps>) {
  const { labels, podMediaLabels } = useHostPodActionsConfig();

  return (
    <>
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
      {/* Above Cancel on purpose: asking for a different host keeps the pod and
          everyone's seat, and it is the thing a host should reach for first. */}
      {onRequestChange && requestChangeLabel && (
        <MenuItem onClick={pick(onRequestChange)}>
          <ListItemIcon>
            <SwapHorizIcon fontSize="small" color="warning" />
          </ListItemIcon>
          <ListItemText primary={requestChangeLabel} />
        </MenuItem>
      )}
      <MenuItem onClick={pick(onCancel)} sx={{ color: 'error.main' }}>
        <ListItemIcon>
          <CancelIcon fontSize="small" color="error" />
        </ListItemIcon>
        <ListItemText primary={labels.cancelPod} />
      </MenuItem>
    </>
  );
}
