import { useState } from 'react';
import { DuncitButton } from '@duncit/buttons';
import {
  autoPodWithdrawable,
  type AutoPodLabels,
  type AutoPodRole,
  type AutoPodRow,
} from '@duncit/utils';
import { AutoPodWithdrawDialog } from './AutoPodWithdrawDialog';

export interface AutoPodWithdrawActionProps {
  row: AutoPodRow;
  /** Whose enrolment the button takes back — the slot, the hosting or the claim. */
  role: AutoPodRole;
  labels: AutoPodLabels;
  onWithdrawn: () => void;
}

/**
 * The Cancel on a row this partner enrolled in, and the confirmation it opens.
 * Rendered under the role's "assigned" heading on mWeb and the Partners portal
 * alike — including the club admin's "Final assigned Auto Pods", because
 * enrolments happen in any order and a club is often not the last one in.
 * Draws nothing once the offer is past withdrawing: everyone needed is on it,
 * the pod exists, and it is cancelled from the Pods page instead.
 * `autoPodWithdrawable()` in `@duncit/utils` is the one rule behind it, and
 * the native twin (`AutoPodWithdrawSheet`) reads the same rule.
 */
export function AutoPodWithdrawAction({
  row,
  role,
  labels,
  onWithdrawn,
}: Readonly<AutoPodWithdrawActionProps>) {
  const [open, setOpen] = useState(false);
  if (!autoPodWithdrawable(row, role)) return null;

  return (
    <>
      <DuncitButton
        fullWidth
        size="small"
        variant="outlined"
        color="error"
        onClick={() => setOpen(true)}
        data-testid="auto-pod-withdraw"
      >
        {labels.withdrawCta}
      </DuncitButton>
      <AutoPodWithdrawDialog
        row={row}
        role={role}
        labels={labels}
        open={open}
        onClose={() => setOpen(false)}
        onWithdrawn={onWithdrawn}
      />
    </>
  );
}
