import { useEffect } from 'react';
import type { AutoPodLabels, AutoPodRow } from '@duncit/utils';
import { EarningsDialogShell } from '../earnings/EarningsDialogShell';
import { HostEarningsFields } from './HostEarningsFields';
import { useHostProjection } from './useHostProjection';

export interface HostEarningsDialogProps {
  row: AutoPodRow | null;
  labels: AutoPodLabels;
  open: boolean;
  onClose: () => void;
  formatMoney: (amount: number) => string;
  /** What the host worked out, for the card's "You could earn" line. */
  onEarnings?: (amount: number | null) => void;
}

/**
 * A host's "View Potential Earnings": what this offer would pay THEM at a
 * ticket price they choose and the spots they drag to, under their own rates
 * and the venue's slot price. Read-only — assigning is a separate, deliberate
 * step — so a host can price the pod before deciding whether to take it.
 */
export function HostEarningsDialog({
  row,
  labels,
  open,
  onClose,
  formatMoney,
  onEarnings,
}: Readonly<HostEarningsDialogProps>) {
  const state = useHostProjection(
    row?.id ?? null,
    { pod_amount: row?.pod_amount ?? 0, no_of_spots: row?.no_of_spots ?? 0 },
    open
  );

  // The card's earn line follows the calculator live, so closing the dialog is
  // never the moment a host discovers what they had worked out.
  const host = state.viable ? state.projection?.host_receives ?? null : null;
  useEffect(() => {
    if (open && onEarnings) onEarnings(host);
  }, [open, host, onEarnings]);

  return (
    <EarningsDialogShell labels={labels} open={open} onClose={onClose}>
      <HostEarningsFields state={state} labels={labels} formatMoney={formatMoney} />
    </EarningsDialogShell>
  );
}
