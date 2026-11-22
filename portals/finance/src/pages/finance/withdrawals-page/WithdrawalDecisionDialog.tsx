import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@apollo/client/react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { QueryGuard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { DECIDE_WITHDRAWAL, WITHDRAWAL_REVIEW, type WithdrawalReviewData } from './queries';
import WithdrawalDecisionFields from './WithdrawalDecisionFields';
import WithdrawalReviewDetails from './WithdrawalReviewDetails';
import {
  DEFAULT_DECISION_VALUES,
  buildDecisionSchema,
  toDecisionInput,
  type DecisionFormValues,
} from './withdrawal-decision.schema';

interface Props {
  /** The withdrawal being reviewed; `null` closes the dialog. */
  withdrawalId: string | null;
  onClose: () => void;
  /** Called after a decision is saved, so the table and the pod header re-read. */
  onDecided: () => void;
}

/**
 * Accept, partially approve or reject one withdrawal — with the person, the
 * amount and the account in front of the Finance Manager.
 *
 * Nothing here decides anything on its own: the dialog collects the choice and
 * the server re-checks every rule (amount, reason, verified account, payouts set
 * up, who is allowed). It only ever offers what the server will accept.
 */
export default function WithdrawalDecisionDialog({ withdrawalId, onClose, onDecided }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<WithdrawalReviewData>(WITHDRAWAL_REVIEW, {
    variables: { id: withdrawalId },
    skip: !withdrawalId,
    // A decision is made on what the account looks like NOW, never on a cached copy.
    fetchPolicy: 'network-only',
  });
  const [decide, { loading: saving }] = useMutation(DECIDE_WITHDRAWAL);
  const review = data?.withdrawalReview;
  const requested = review?.withdrawal.requested_amount ?? 0;

  const schema = useMemo(
    () =>
      buildDecisionSchema(
        { requested, needsAcknowledgement: review ? !review.account_verified : false },
        {
          reasonRequired: t('finance.payouts.reasonRequired'),
          reasonTooLong: t('finance.payouts.reasonTooLong'),
          amountRequired: t('finance.payouts.amountRequired'),
          amountBelowRequested: t('finance.payouts.amountBelowRequested'),
          amountPrecision: t('finance.payouts.amountPrecision'),
          acknowledgeRequired: t('finance.payouts.acknowledgeRequired'),
        },
      ),
    [requested, review, t],
  );
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DecisionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_DECISION_VALUES,
    mode: 'onSubmit',
  });
  const decision = watch('decision');
  // Money goes out only when payouts are set up AND the request is still undecided.
  // An approved withdrawal whose payout failed can only be given up on (rejected).
  const canPay = !!review && review.payouts_configured && review.withdrawal.approval_status === 'PENDING';

  // A fresh target must never inherit the previous review's choice or reason.
  useEffect(() => {
    if (withdrawalId) reset(DEFAULT_DECISION_VALUES);
  }, [withdrawalId, reset]);

  useEffect(() => {
    if (review && !canPay) setValue('decision', 'REJECT');
  }, [review, canPay, setValue]);

  const submit = handleSubmit(async (values) => {
    if (!withdrawalId) return;
    try {
      await decide({ variables: { id: withdrawalId, input: toDecisionInput(values) } });
      notifySuccess(
        {
          APPROVE: t('finance.payouts.toastApproved'),
          PARTIAL: t('finance.payouts.toastPartial'),
          REJECT: t('finance.payouts.toastRejected'),
        }[values.decision],
      );
      onDecided();
      onClose();
    } catch (e) {
      notifyError(parseApiError(e));
    }
  });

  const confirmLabel = {
    APPROVE: t('finance.payouts.confirmApprove'),
    PARTIAL: t('finance.payouts.confirmPartial'),
    REJECT: t('finance.payouts.confirmReject'),
  }[decision];

  return (
    <Dialog open={!!withdrawalId} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('finance.payouts.reviewTitle')}</DialogTitle>
      <DialogContent dividers>
        <QueryGuard loading={loading && !review} error={error} notFound={!review} spinnerSx={{ p: 4 }}>
          {() =>
            review ? (
              <Stack spacing={3}>
                <WithdrawalReviewDetails review={review} />
                <WithdrawalDecisionFields
                  control={control}
                  register={register}
                  errors={errors}
                  decision={decision}
                  requested={requested}
                  currencySymbol={review.currency_symbol}
                  accountVerified={review.account_verified}
                  payoutsConfigured={canPay}
                />
              </Stack>
            ) : null
          }
        </QueryGuard>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={saving}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton
          variant="contained"
          color={decision === 'REJECT' ? 'error' : 'primary'}
          disabled={saving || !review || (decision !== 'REJECT' && !canPay)}
          onClick={submit}
        >
          {confirmLabel}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}

