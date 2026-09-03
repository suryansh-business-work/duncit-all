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
  /** Whose enrolment the button takes back — a venue's slot or a host's assignment. */
  role: Extract<AutoPodRole, 'venue' | 'host'>;
  labels: AutoPodLabels;
  onWithdrawn: () => void;
}

/**
 * The Cancel on a row this venue or host enrolled in, and the confirmation it
 * opens. Rendered under the role's "assigned" heading on mWeb and the Partners
 * portal alike; draws nothing once the offer is past withdrawing — the club
 * admin's claim completes the pod, so from then on there is nothing to leave.
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
