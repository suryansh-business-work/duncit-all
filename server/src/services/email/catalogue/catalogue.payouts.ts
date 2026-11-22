import { LIVE, PAUSED, STOPPED } from './mjml';
import { FIELD, FOOTER } from './catalogue.copy';
import { defineEmail, v, type EmailDef } from './catalogue.types';

/**
 * The money-out emails: a withdrawal approved, partly approved, rejected or
 * paid, and a manual Send Money transfer that landed.
 *
 * Each is the email twin of a WhatsApp scenario (same moment, same values in
 * the same order — see `WA_EVENTS`), written here as data so the Communications
 * portal edits and translates them like every other email. Plain text only:
 * no emoji or symbol icons in a subject or body.
 */

const F = {
  requestedAmount: 'email.field.requestedAmount',
  approvedAmount: 'email.field.approvedAmount',
  paymentStatus: 'email.field.paymentStatus',
  reference: 'email.field.reference',
} as const;

const NAME = v('name', 'The recipient’s name.', 'Meera N');

export const PAYOUT_EMAILS: readonly EmailDef[] = [
  defineEmail({
    slug: 'withdrawal-approved',
    name: 'Payout: Withdrawal Approved',
    description: 'Anyone who withdrew from their wallet, when Finance approves the whole amount.',
    audience: 'USER',
    category: 'transactional',
    fires: 'Finance approves a withdrawal in full',
    waEvent: 'WITHDRAWAL_APPROVED',
    subject: 'Your Duncit withdrawal was approved',
    footerNote: FOOTER.payout,
    vars: [
      NAME,
      v('approved_amount', 'The amount being paid.', 'Rs 2500.00'),
      v('payment_status', 'Where the payment stands.', 'Processing'),
    ],
    body: {
      copyKey: 'email.withdrawalApproved',
      nameVar: 'name',
      tone: LIVE,
      calloutLabelKey: F.approvedAmount,
      calloutVar: 'approved_amount',
      rows: [{ labelKey: F.paymentStatus, valueVar: 'payment_status' }],
    },
  }),
  defineEmail({
    slug: 'withdrawal-partially-approved',
    name: 'Payout: Withdrawal Partially Approved',
    description: 'Anyone who withdrew from their wallet, when Finance approves only part of the amount.',
    audience: 'USER',
    category: 'transactional',
    fires: 'Finance partially approves a withdrawal',
    waEvent: 'WITHDRAWAL_PARTIALLY_APPROVED',
    subject: 'Your Duncit withdrawal was partially approved',
    footerNote: FOOTER.payout,
    vars: [
      NAME,
      v('requested_amount', 'What the person asked for.', 'Rs 2500.00'),
      v('approved_amount', 'What was approved and is being paid.', 'Rs 1800.00'),
      v('reason', 'Why only part was approved.', 'Part of the balance is on hold for a pending refund.'),
    ],
    body: {
      copyKey: 'email.withdrawalPartiallyApproved',
      nameVar: 'name',
      tone: PAUSED,
      calloutLabelKey: F.approvedAmount,
      calloutVar: 'approved_amount',
      rows: [
        { labelKey: F.requestedAmount, valueVar: 'requested_amount' },
        { labelKey: FIELD.reason, valueVar: 'reason' },
      ],
    },
  }),
  defineEmail({
    slug: 'withdrawal-rejected',
    name: 'Payout: Withdrawal Rejected',
    description: 'Anyone who withdrew from their wallet, when Finance does not approve it.',
    audience: 'USER',
    category: 'transactional',
    fires: 'Finance rejects a withdrawal',
    waEvent: 'WITHDRAWAL_REJECTED',
    subject: 'Your Duncit withdrawal was not approved',
    footerNote: FOOTER.payout,
    vars: [
      NAME,
      v('requested_amount', 'What the person asked for.', 'Rs 2500.00'),
      v('reason', 'Why it was not approved.', 'The bank details need to be checked.'),
    ],
    body: {
      copyKey: 'email.withdrawalRejected',
      nameVar: 'name',
      tone: STOPPED,
      calloutLabelKey: F.requestedAmount,
      calloutVar: 'requested_amount',
      rows: [{ labelKey: FIELD.reason, valueVar: 'reason' }],
    },
  }),
  defineEmail({
    slug: 'withdrawal-paid',
    name: 'Payout: Withdrawal Paid',
    description: 'Anyone who withdrew from their wallet, when the money reaches their bank account.',
    audience: 'USER',
    category: 'transactional',
    fires: 'Razorpay confirms the withdrawal payout was processed',
    waEvent: 'WITHDRAWAL_PAID',
    subject: 'Your Duncit withdrawal was paid',
    footerNote: FOOTER.payout,
    vars: [
      NAME,
      v('amount', 'The amount paid.', 'Rs 2500.00'),
      v('reference', 'The bank transaction reference (UTR).', '412345678901'),
    ],
    body: {
      copyKey: 'email.withdrawalPaid',
      nameVar: 'name',
      tone: LIVE,
      calloutLabelKey: FIELD.amount,
      calloutVar: 'amount',
      rows: [{ labelKey: F.reference, valueVar: 'reference' }],
    },
  }),
  defineEmail({
    slug: 'send-money-paid',
    name: 'Payout: Money Sent',
    description: 'Anyone Finance pays by hand (salary, a refund, a reimbursement), when the money reaches their account.',
    audience: 'USER',
    category: 'transactional',
    fires: 'Razorpay confirms a Send Money transfer was processed',
    waEvent: 'SEND_MONEY_PAID',
    subject: 'You have received a payment from Duncit',
    footerNote: FOOTER.payout,
    vars: [
      NAME,
      v('amount', 'The amount sent.', 'Rs 15000.00'),
      v('reason', 'What the payment is for.', 'October salary'),
      v('reference', 'The bank transaction reference (UTR).', '412345678901'),
    ],
    body: {
      copyKey: 'email.sendMoneyPaid',
      nameVar: 'name',
      tone: LIVE,
      calloutLabelKey: FIELD.amount,
      calloutVar: 'amount',
      rows: [
        { labelKey: FIELD.reason, valueVar: 'reason' },
        { labelKey: F.reference, valueVar: 'reference' },
      ],
    },
  }),
];

/** English copy for the rows above — shipped and seeded like every other email key. */
export const PAYOUT_EMAIL_FALLBACK: Record<string, string> = {
  'email.field.requestedAmount': 'Amount requested',
  'email.field.approvedAmount': 'Amount approved',
  'email.field.paymentStatus': 'Payment status',
  'email.field.reference': 'Transaction reference',
  'email.withdrawalApproved.title': 'Your withdrawal was approved',
  'email.withdrawalApproved.body':
    'Our Finance team approved your withdrawal. The amount below is being sent to your bank account, and we will email you again once it arrives.',
  'email.withdrawalPartiallyApproved.title': 'Your withdrawal was partially approved',
  'email.withdrawalPartiallyApproved.body':
    'Our Finance team approved part of your withdrawal. The approved amount is being sent to your bank account and the rest has gone back to your Duncit wallet.',
  'email.withdrawalRejected.title': 'Your withdrawal was not approved',
  'email.withdrawalRejected.body':
    'Our Finance team could not approve your withdrawal, for the reason below. The full amount has gone back to your Duncit wallet.',
  'email.withdrawalPaid.title': 'Your withdrawal was paid',
  'email.withdrawalPaid.body':
    'The money below has reached your bank account. Keep the transaction reference if you need to trace it with your bank.',
  'email.sendMoneyPaid.title': 'You have received a payment',
  'email.sendMoneyPaid.body':
    'Duncit has sent you the payment below, and it has reached your bank account. Keep the transaction reference if you need to trace it with your bank.',
};
