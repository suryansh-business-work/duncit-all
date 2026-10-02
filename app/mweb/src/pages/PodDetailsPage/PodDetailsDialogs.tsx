import type { ComponentProps } from 'react';
import type { backoutAttemptsLeft as backoutAttemptsLeftFor } from '@duncit/utils';
import type { usePricing } from '../../hooks/usePricing';
import BackoutConfirmDialog from '../pod-details-page/BackoutConfirmDialog';
import KeepSpotDialog from '../pod-details-page/KeepSpotDialog';
import type StickyPodActionPanel from '../pod-details-page/StickyPodActionPanel';
import type { usePodDetailActions } from '../pod-details-page/usePodDetailActions';
import ConfettiOverlay from '../../components/ConfettiOverlay';

interface PodDetailsDialogsProps {
  actions: ReturnType<typeof usePodDetailActions>;
  membershipState: ComponentProps<typeof StickyPodActionPanel>['membershipState'];
  currency: ReturnType<typeof usePricing>['currency'];
  backoutAttemptsLeft: ReturnType<typeof backoutAttemptsLeftFor>;
}

/** Back-out confirm, keep-my-spot and the join confetti. */
export default function PodDetailsDialogs({
  actions,
  membershipState,
  currency,
  backoutAttemptsLeft,
}: Readonly<PodDetailsDialogsProps>) {
  return (
    <>
      <BackoutConfirmDialog
        open={actions.backoutOpen}
        onClose={() => actions.setBackoutOpen(false)}
        busy={actions.backoutState.loading}
        refundAmount={membershipState?.backout_refund_amount ?? null}
        refundPerSeat={membershipState?.backout_refund_per_seat ?? null}
        mySeats={membershipState?.my_seats ?? 1}
        currency={currency}
        deductionPct={membershipState?.backout_deduction_pct ?? 0}
        refundCoins={membershipState?.backout_refund_coins ?? 0}
        onConfirm={actions.onConfirmBackout}
      />
      <KeepSpotDialog
        open={actions.keepSpotOpen}
        onClose={() => actions.setKeepSpotOpen(false)}
        busy={actions.cancelBackoutState.loading}
        attemptsLeft={backoutAttemptsLeft}
        error={actions.keepSpotError}
        onConfirm={actions.onConfirmKeepSpot}
      />
      <ConfettiOverlay
        open={actions.confettiOpen}
        onClose={() => actions.setConfettiOpen(false)}
      />
    </>
  );
}
