import { ListItemIcon, ListItemText, MenuItem } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PodLinkRows from './PodLinkRows';
import type { HostPodMenuItemsProps } from './types';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';

export type { HostPodMenuItemsProps } from './types';

/**
 * The rows inside the host's overflow menu.
 *
 * Split out of `HostPodActionsMenu` when the menu passed the 200-line ceiling
 * (rule 9): the parent is now the button, the anchor and the popover, and this
 * is what goes inside it. Behaviour is unchanged — every item, and every
 * condition guarding it, moved across verbatim.
 */
export default function HostPodActionsItems({
  podId,
  showAttendeeActions,
  canComplete,
  canScan,
  scanNote,
  canAmend,
  pick,
  onScan,
  onComplete,
  onSeeAttendance,
  onChallenges,
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
  const { labels } = useHostPodActionsConfig();

  return (
    <>
      {showAttendeeActions && (
        <MenuItem
          disabled={!canScan}
          onClick={pick(onScan)}
          data-testid={`host-pod-action-scan-${podId}`}
        >
          <ListItemIcon>
            <QrCodeScannerIcon fontSize="small" color={canScan ? 'primary' : 'disabled'} />
          </ListItemIcon>
          <ListItemText primary={labels.scanTickets} secondary={scanNote} />
        </MenuItem>
      )}
      {showAttendeeActions && onSeeAttendance && (
        <MenuItem onClick={pick(onSeeAttendance)} data-testid={`host-pod-action-attendance-${podId}`}>
          <ListItemIcon>
            <FactCheckIcon fontSize="small" color="success" />
          </ListItemIcon>
          <ListItemText primary={labels.seeAttendance} />
        </MenuItem>
      )}
      {onChallenges && (
        <MenuItem onClick={pick(onChallenges)} data-testid={`host-pod-action-challenges-${podId}`}>
          <ListItemIcon>
            <EmojiEventsIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText primary={labels.challenges} />
        </MenuItem>
      )}
      {onSlotRequest && (
        <MenuItem
          onClick={pick(onSlotRequest)}
          data-testid={`host-pod-action-slot-request-${podId}`}
        >
          <ListItemIcon>
            <PendingActionsIcon fontSize="small" color="warning" />
          </ListItemIcon>
          <ListItemText primary={labels.slotRequest} />
        </MenuItem>
      )}
      {showAttendeeActions && canComplete && (
        <MenuItem onClick={pick(onComplete)} data-testid={`host-pod-action-complete-${podId}`}>
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
      <MenuItem
        disabled={!canAmend}
        onClick={pick(onEdit)}
        data-testid={`host-pod-action-edit-${podId}`}
      >
        <ListItemIcon>
          <EditIcon fontSize="small" color={canAmend ? 'inherit' : 'disabled'} />
        </ListItemIcon>
        <ListItemText
          primary={labels.editPod}
          secondary={canAmend ? undefined : labels.amendClosed}
        />
      </MenuItem>
      <PodLinkRows
        podId={podId}
        showAttendeeActions={showAttendeeActions}
        pick={pick}
        onOpenPodMedia={onOpenPodMedia}
        onSharePodMedia={onSharePodMedia}
        onCopyPodMedia={onCopyPodMedia}
        onOpenFeedback={onOpenFeedback}
        onShareFeedback={onShareFeedback}
        onCopyFeedback={onCopyFeedback}
      />
      {onClubAdmin && (
        <MenuItem onClick={pick(onClubAdmin)} data-testid={`host-pod-action-club-admin-${podId}`}>
          <ListItemIcon>
            <SupportAgentIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText primary={labels.clubAdmin} />
        </MenuItem>
      )}
      {/* Above Cancel on purpose: asking for a different host keeps the pod and
          everyone's seat, and it is the thing a host should reach for first. */}
      {onRequestChange && requestChangeLabel && (
        <MenuItem
          disabled={!canAmend}
          onClick={pick(onRequestChange)}
          data-testid={`host-pod-action-request-change-${podId}`}
        >
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
        data-testid={`host-pod-action-cancel-${podId}`}
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
