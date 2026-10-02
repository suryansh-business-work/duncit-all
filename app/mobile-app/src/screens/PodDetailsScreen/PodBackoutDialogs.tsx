import { backoutAttemptsLeft as attemptsLeftFor } from '@duncit/utils';

import { BackoutConfirmDialog } from '@/components/pod-history/BackoutConfirmDialog';
import { KeepSpotDialog } from '@/components/pod-history/KeepSpotDialog';
import type { PodMembershipState } from '@/hooks/useDetails';

import type { PodDetailActions } from './usePodDetailActions';

interface PodBackoutDialogsProps {
  actions: PodDetailActions;
  membershipState: PodMembershipState | null;
  onViewTerms: () => void;
}

/** The Backout and Keep-My-Spot dialogs, with their refund and attempt figures
 * read off the viewer's membership state. */
export function PodBackoutDialogs({
  actions,
  membershipState,
  onViewTerms,
}: Readonly<PodBackoutDialogsProps>) {
  const backoutAttemptsLeft = attemptsLeftFor(membershipState);
  return (
    <>
      <BackoutConfirmDialog
        open={actions.backoutOpen}
        busy={actions.backingOut}
        onClose={() => actions.setBackoutOpen(false)}
        onConfirm={actions.onConfirmBackout}
        refundAmount={membershipState?.backout_refund_amount ?? null}
        refundPerSeat={membershipState?.backout_refund_per_seat ?? null}
        mySeats={membershipState?.my_seats ?? 1}
        deductionPct={membershipState?.backout_deduction_pct ?? 0}
        refundCoins={membershipState?.backout_refund_coins ?? 0}
        onViewTerms={onViewTerms}
      />
      <KeepSpotDialog
        open={actions.keepSpotOpen}
        busy={actions.restoringSpot}
        attemptsLeft={backoutAttemptsLeft}
        error={actions.keepSpotError}
        onClose={() => actions.setKeepSpotOpen(false)}
        onConfirm={actions.onConfirmKeepSpot}
      />
    </>
  );
}
