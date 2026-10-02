import { Text } from 'tamagui';

import type { PodDeleteImpact } from '../pod-edit.form';

/** Refund/audience impact line for the delete sheet. */
export function ImpactSummary({ impact }: Readonly<{ impact: PodDeleteImpact }>) {
  if (impact.other_attendee_count === 0) {
    return (
      <Text testID="pod-delete-impact" fontSize={12.5} color="$muted">
        No one else has joined this pod — it will be cancelled immediately.
      </Text>
    );
  }
  const refundLine =
    impact.refundable_payment_count > 0
      ? ` Cancelling initiates a refund of ${impact.currency_symbol}${impact.refund_total} across ${impact.refundable_payment_count} payment(s), logged in the Finance portal.`
      : '';
  return (
    <Text testID="pod-delete-impact" fontSize={12.5} color="$danger">
      {impact.other_attendee_count} other attendee(s) joined this pod.{refundLine} All attendees
      will be emailed.
    </Text>
  );
}
