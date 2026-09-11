import { useState } from 'react';
import { Menu, Tooltip } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { DuncitIconButton } from '@duncit/buttons';
import type { PodScanWindow } from '@duncit/utils';
import HostPodActionsItems, { type HostPodMenuItemsProps } from './HostPodActionsItems';
import { useHostPodActionsConfig } from './HostPodActionsProvider';

interface Props
  extends Omit<
    HostPodMenuItemsProps,
    'showAttendeeActions' | 'canComplete' | 'canScan' | 'scanNote' | 'canAmend' | 'pick'
  > {
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
  /**
   * Where the pod's door stands. Scanning a ticket is what happens AT a door,
   * so the row is inert until shortly before the start, and again the moment
   * the pod is over — the host settles it from the roster after that.
   */
  scanWindow?: PodScanWindow;
  /**
   * The pod has not ended yet, so its plan can still change. Once it is over,
   * Edit, Request Change Host and Cancel all go inert — they rewrite a plan the
   * pod no longer has. Settling it is Complete’s job.
   */
  canAmend?: boolean;
}

/**
 * Every per-pod action behind one overflow button, so a row stays readable and
 * the destructive one is not a click away from the rest.
 *
 * The same actions the native app shows in its PodActionsSheet (rule 27). The
 * ROWS live in `HostPodActionsItems` — this is the button, the anchor and the
 * popover around them (rule 9: neither file passes 200 lines).
 */
export default function HostPodActionsMenu({
  podTitle,
  disabled = false,
  venueRejected = false,
  canComplete = false,
  scanWindow = 'OPEN',
  canAmend = true,
  ...items
}: Readonly<Props>) {
  const { labels } = useHostPodActionsConfig();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  // Why the scan row is inert — "not yet" and "too late" are different answers.
  const scanNotes: Record<PodScanWindow, string | undefined> = {
    NOT_OPEN: labels.scanNotOpen,
    OPEN: undefined,
    CLOSED: labels.scanClosed,
  };

  const pick = (action: () => void) => () => {
    setAnchorEl(null);
    action();
  };

  return (
    <>
      <Tooltip title={labels.menuTooltip}>
        <span>
          <DuncitIconButton
            size="small"
            disabled={disabled}
            aria-label={labels.menuAria(podTitle)}
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <MoreVertIcon fontSize="small" />
          </DuncitIconButton>
        </span>
      </Tooltip>
      <Menu
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <HostPodActionsItems
          {...items}
          // The actions that only make sense for a pod that actually gets to run.
          showAttendeeActions={!venueRejected}
          canComplete={canComplete}
          canScan={scanWindow === 'OPEN'}
          scanNote={scanNotes[scanWindow]}
          canAmend={canAmend}
          pick={pick}
        />
      </Menu>
    </>
  );
}
