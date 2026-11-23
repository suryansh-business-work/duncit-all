/**
 * Cell renderers shared by every finance table that lists payments.
 *
 * Payment Logs and User Refund Logs show the same buyer and the same pair of
 * identifiers, so the two-line layouts live here rather than once per table —
 * a second copy is how the two screens start labelling one payment differently.
 * Both take the narrowest row shape they read, so any row carrying those fields
 * can use them.
 */
import { Stack, Typography } from '@mui/material';
import { LabeledIds, labeledIdsText, type LabeledId } from '@duncit/table';
import type { Translator } from '@duncit/app-settings';
import { traceIdValue } from '../../../components/TraceLink';

export const renderPaymentCustomer = (p: Readonly<{ user_name: string; user_email: string }>) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="span" sx={{
      fontWeight: 600
    }}>
      {p.user_name}
    </Typography>
    <Typography variant="caption" component="span" sx={{
      color: "text.secondary"
    }}>
      {p.user_email}
    </Typography>
  </Stack>
);

/** The ids one payment row can carry: Razorpay's (only when it went through Razorpay) and Duncit's own. */
export interface PaymentIdFields {
  payment_id: string;
  invoice_no: string | null;
  razorpay_payment_id?: string | null;
  razorpay_order_id?: string | null;
  razorpay_refund_ids?: readonly string[] | null;
}

/**
 * Every id of a payment under its own name. Razorpay's ids come first because
 * they are what Finance compares against the Razorpay dashboard; Duncit's own
 * reference is labelled as ours, since it never matches anything there. Each
 * refund id gets its own line, so each one can be traced on its own.
 */
export const paymentIds = (t: Translator['t'], p: Readonly<PaymentIdFields>): LabeledId[] => [
  { label: t('finance.payment.idRazorpayPayment'), value: p.razorpay_payment_id },
  { label: t('finance.payment.idRazorpayOrder'), value: p.razorpay_order_id },
  ...(p.razorpay_refund_ids ?? []).map((value) => ({ label: t('finance.payment.idRazorpayRefund'), value })),
  { label: t('finance.payment.idDuncitRef'), value: p.payment_id },
  { label: t('finance.payment.idInvoice'), value: p.invoice_no },
];

/**
 * The IDs cell and its text value, for any table whose rows carry PaymentIdFields.
 * Every id is a link to Payment Trace: every payment and log it appears in.
 */
export const renderPaymentIds = (t: Translator['t']) => (p: Readonly<PaymentIdFields>) => (
  <LabeledIds ids={paymentIds(t, p)} renderValue={traceIdValue} />
);
export const paymentIdsText = (t: Translator['t'], p: Readonly<PaymentIdFields>) => labeledIdsText(paymentIds(t, p));
