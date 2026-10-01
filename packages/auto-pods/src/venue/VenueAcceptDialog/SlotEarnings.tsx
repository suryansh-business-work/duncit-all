import Alert from '@mui/material/Alert';
import type { AutoPodLabels } from '@duncit/utils';
import type { AutoPodVenueSlot } from './types';

/** What the chosen slot pays the venue — or why it cannot be chosen. */
export function SlotEarnings({
  slot,
  labels,
  formatMoney,
}: Readonly<{ slot: AutoPodVenueSlot | null; labels: AutoPodLabels; formatMoney: (amount: number) => string }>) {
  if (!slot) return null;
  if (!slot.viable) return <Alert severity="warning">{labels.slotNotViable}</Alert>;
  return (
    <Alert severity="success" data-testid="auto-pod-slot-earning">
      {labels.potentialEarning(formatMoney(slot.venue_receives))}
    </Alert>
  );
}
