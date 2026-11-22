import WithdrawalDecisionDialog from './WithdrawalDecisionDialog';

interface Props {
  /** The withdrawal being reviewed (Accept was pressed on its row); `null` closes the dialog. */
  reviewId: string | null;
  onClose: () => void;
  /** After a decision is saved, so the list and the pod header re-read. */
  onDecided: () => void;
}

/**
 * Reviewing one withdrawal, kept as its own seam so the pod page stays about the
 * pod. One dialog now carries all three outcomes — Accept, Partially approve,
 * Reject — because Finance chooses between them while looking at the same
 * person, amount and account.
 *
 * "Mark Paid" is gone on purpose: a withdrawal is paid through Razorpay and
 * becomes PAID only when Razorpay confirms it, never because somebody said so.
 */
export default function WithdrawalReviewDialogs({ reviewId, onClose, onDecided }: Readonly<Props>) {
  return <WithdrawalDecisionDialog withdrawalId={reviewId} onClose={onClose} onDecided={onDecided} />;
}
