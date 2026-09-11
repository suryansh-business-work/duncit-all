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
  /**
   * The pod has not ended yet, so its door is still open to a scanner. False on
   * a past pod: the row stays, greyed, saying why.
   */
  canScan: boolean;
  /**
   * The pod has not ended yet, so its plan can still change. False on a past
   * pod, which greys Edit, Request Change Host and Cancel the same way — all
   * three change something that has already happened.
   */
  canAmend: boolean;
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
  canScan,
  canAmend,
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
        <MenuItem disabled={!canScan} onClick={pick(onScan)}>
          <ListItemIcon>
            <QrCodeScannerIcon fontSize="small" color={canScan ? 'primary' : 'disabled'} />
          </ListItemIcon>
          <ListItemText
            primary={labels.scanTickets}
            secondary={canScan ? undefined : labels.scanClosed}
          />
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
      {/* Edit, Request Change Host and Cancel all rewrite a pod's plan, so a
          pod that has already run greys all three — with the reason on each,
          because they are not adjacent and a host reaching for any one of them
          deserves the same answer. */}
      <MenuItem disabled={!canAmend} onClick={pick(onEdit)}>
        <ListItemIcon>
          <EditIcon fontSize="small" color={canAmend ? 'inherit' : 'disabled'} />
        </ListItemIcon>
        <ListItemText
          primary={labels.editPod}
          secondary={canAmend ? undefined : labels.amendClosed}
        />
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
        <MenuItem disabled={!canAmend} onClick={pick(onRequestChange)}>
          <ListItemIcon>
            <SwapHorizIcon fontSize="small" color={canAmend ? 'warning' : 'disabled'} />
          </ListItemIcon>
          <ListItemText
            primary={requestChangeLabel}
            secondary={canAmend ? undefined : labels.amendClosed}
          />
        </MenuItem>
      )}
      <MenuItem
        disabled={!canAmend}
        onClick={pick(onCancel)}
        sx={canAmend ? { color: 'error.main' } : undefined}
      >
        <ListItemIcon>
          <CancelIcon fontSize="small" color={canAmend ? 'error' : 'disabled'} />
        </ListItemIcon>
        <ListItemText
          primary={labels.cancelPod}
          secondary={canAmend ? undefined : labels.amendClosed}
        />
      </MenuItem>
    </>
  );
}
