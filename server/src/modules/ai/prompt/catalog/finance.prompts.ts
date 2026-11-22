import { PROMPT_CATEGORIES, required, type InAppPromptDef } from '../prompt.types';

const { FINANCE } = PROMPT_CATEGORIES;

const EVIDENCE_SITE = {
  file: 'server/src/modules/finance/failedPayment/failedPayment.ai.ts',
  surface: 'Finance · Failed Payments',
  trigger: 'A buyer sends a payment screenshot or a bank statement image with a deduction claim, or Finance re-runs the check',
} as const;

/**
 * The payment-evidence reader behind Finance › Failed Payments
 * (AI feature `finance.payment_evidence`). It only READS the picture — the
 * decision is made in code against Razorpay's own records.
 */
export const FINANCE_PROMPTS: readonly InAppPromptDef[] = [
  {
    key: 'finance.payment_evidence',
    name: 'Payment evidence reader',
    description: 'Reads the payment id, bank reference, amount, date, status and payee off a buyer’s payment screenshot.',
    category: FINANCE,
    role: 'SYSTEM',
    tasks: ['finance.payment_evidence'],
    target_model: 'gpt-4o-mini',
    variables: [],
    usage: [EVIDENCE_SITE],
    content: [
      'You read payment proof for Duncit Finance (AI feature finance.payment_evidence).',
      'You are shown one or more images a buyer sent to prove money left their account:',
      'a UPI / bank app screenshot, a card statement or a bank statement page.',
      'Copy ONLY what is printed on the images; never guess, never invent a value.',
      'payment_id: a Razorpay payment id if one is printed (it starts with "pay_").',
      'utr: the bank reference — UTR, RRN, UPI transaction id or bank transaction id.',
      'amount: the amount debited, as printed (digits and decimal point only).',
      'date: the transaction date as printed. status: the status as printed (e.g. Success, Failed, Pending).',
      'payee: who was paid, as printed.',
      'Use an empty string for anything not clearly visible. confidence is 0 to 1: how sure you are the',
      'images are a genuine record of this one payment.',
      'Return STRICT JSON only, no markdown, of shape',
      '{"payment_id":string,"utr":string,"amount":string,"date":string,"status":string,"payee":string,"confidence":number}.',
    ].join('\n'),
  },
  {
    key: 'finance.payment_evidence.user',
    name: 'Payment evidence — claim context',
    description: 'Tells the reader which checkout the evidence is for, so it reports the matching debit.',
    category: FINANCE,
    role: 'USER',
    tasks: ['finance.payment_evidence'],
    target_model: 'gpt-4o-mini',
    variables: [
      required('amount', 'Checkout amount', 'What the checkout asked the buyer to pay, with currency.', '₹499.00'),
      required('evidence_type', 'Evidence type', 'What the buyer said they are sending.', 'SCREENSHOT'),
    ],
    usage: [EVIDENCE_SITE],
    content:
      'The buyer says {{amount}} was deducted for a Duncit booking and sent this {{evidence_type}}. Read the debit from these images.',
  },
];
