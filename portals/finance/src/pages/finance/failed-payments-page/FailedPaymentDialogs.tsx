import { useTranslation } from '@duncit/app-settings';
import { fmt } from '../payment-logs-page/helpers';
import ReviewFailedPaymentForm from './review-failed-payment';
import RefundConfirmDialog from './RefundConfirmDialog';
import type { FailedPaymentActions } from './useFailedPaymentActions';

/** Whichever decision dialog is open for the case — nothing when none is. */
export default function FailedPaymentDialogs({ actions }: Readonly<{ actions: FailedPaymentActions }>) {
  const { t } = useTranslation();
  const { dialog } = actions;
  if (!dialog) return null;
  if (dialog.kind === 'REFUND') return <RefundConfirmDialog dialog={dialog} actions={actions} />;
  return (
    <ReviewFailedPaymentForm
      open
      mode={dialog.kind}
      subject={t('finance.failedPayments.dialogSubject', {
        vars: { name: dialog.target.user_name, amount: fmt(dialog.target.amount, dialog.target.currency_symbol) },
      })}
      busy={actions.busy}
      errorMessage={actions.error}
      onClose={actions.close}
      onSubmit={(values) => actions.submitDecision(dialog, values)}
    />
  );
}
