import { Alert } from '@mui/material';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import type { PodDeleteImpact } from '../types';

/** Summarises who is affected — direct cancel vs. refund-initiating cancel. */
export default function ImpactSummary({ impact }: Readonly<{ impact: PodDeleteImpact }>) {
  const { labels } = useHostPodActionsConfig();
  if (impact.other_attendee_count === 0) {
    return (
      <Alert severity="info" data-testid="pod-delete-impact">
        {labels.cancelNoOthers}
      </Alert>
    );
  }
  // One sentence per row rather than fragments joined in JSX: a language that
  // orders the clause differently cannot be built by concatenation.
  const refundLine =
    impact.refundable_payment_count > 0
      ? labels.cancelRefund(
          `${impact.currency_symbol}${impact.refund_total}`,
          impact.refundable_payment_count,
        )
      : labels.cancelEmailOnly;
  return (
    <Alert severity="warning" data-testid="pod-delete-impact">
      {labels.cancelOthers(impact.other_attendee_count)} {refundLine}
    </Alert>
  );
}
