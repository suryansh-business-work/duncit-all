import { useState } from 'react';
import { Menu, Tooltip } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { DuncitIconButton } from '@duncit/buttons';
import HostPodActionsItems, { type HostPodMenuItemsProps } from './HostPodActionsItems';
import { useHostPodActionsConfig } from './HostPodActionsProvider';

interface Props
  extends Omit<HostPodMenuItemsProps, 'showAttendeeActions' | 'canComplete' | 'pick'> {
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
  ...items
}: Readonly<Props>) {
  const { labels } = useHostPodActionsConfig();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

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
          pick={pick}
        />
      </Menu>
    </>
  );
}
