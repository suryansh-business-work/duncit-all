import { Stack, Typography } from '@mui/material';
import { ConfirmDialog } from '@duncit/dialogs';
import { formatMoney } from '@duncit/utils';
import { payoutTarget } from './account-details';
import type { WithdrawalRow } from './queries';
import RejectWithdrawalDialog from './RejectWithdrawalDialog';
import { roleLabel } from './roles';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  payTarget: WithdrawalRow | null;
  rejectTarget: { id: string; name: string } | null;
  busy: boolean;
  onClosePay: () => void;
  onCloseReject: () => void;
  onConfirmPay: () => void;
  onSubmitReject: (id: string, reason: string) => void;
}

/**
 * Both halves of reviewing one withdrawal, kept together so the pod page stays
 * about the pod.
 *
 * The FULL payout details belong here, not in the list. "Mark Paid" presupposes
 * the operator has already made the transfer, which needs the whole account
 * number — masking it everywhere left them with no way to read what they were
 * paying. The list stays masked (a shared screen showing a column of account
 * numbers is the thing worth avoiding); the one dialog opened deliberately, for
 * one row, shows it in full.
 */
export default function WithdrawalReviewDialogs({
  payTarget,
  rejectTarget,
  busy,
  onClosePay,
  onCloseReject,
  onConfirmPay,
  onSubmitReject,
}: Readonly<Props>) {
  const { t } = useTranslation();
  // Elements, not a joined string: ConfirmDialog takes a ReactNode and renders
  // it as HTML, where a "\n" collapses to a space.
  const payMessage = payTarget ? (
    <Stack spacing={1}>
      <Typography variant="body2">
        {`Release ${formatMoney(payTarget.amount, { decimals: 2 })} to ${payTarget.beneficiary_name} (${roleLabel(payTarget.withdrawer_role)}).`}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>
        {`Pay to: ${payoutTarget(payTarget)}`}
      </Typography>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        The amount was already held when the request was raised.
      </Typography>
    </Stack>
  ) : null;

  return (
    <>
      <ConfirmDialog
        open={!!payTarget}
        title={t('finance.withdrawals.markWithdrawalAsPaid')}
        message={payMessage}
        confirmLabel={t('finance.withdrawals.markPaid')}
        busy={busy}
        onClose={onClosePay}
        onConfirm={onConfirmPay}
      />

      <RejectWithdrawalDialog
        target={rejectTarget}
        busy={busy}
        onClose={onCloseReject}
        onSubmit={onSubmitReject}
      />
    </>
  );
}
