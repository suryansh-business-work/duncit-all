/**
 * The deducted-payment claim — one rule for mWeb's dialog and the native sheet,
 * and the transaction-id pattern the server judges with.
 */
import { describe, expect, it } from 'vitest';

import {
  makePaymentClaimSchema,
  PAYMENT_EVIDENCE_FOLDER,
  PAYMENT_EVIDENCE_HINT_KEYS,
  PAYMENT_EVIDENCE_LABEL_KEYS,
  PAYMENT_EVIDENCE_MAX_FILES,
  PAYMENT_EVIDENCE_MIME_TYPES,
  PAYMENT_EVIDENCE_TYPES,
  paymentClaimDefaults,
  paymentClaimInput,
  paymentEvidenceAccepts,
  type PaymentClaimValues,
} from '../src/schemas';

const t = (key: string) => key;
const schema = makePaymentClaimSchema(t);

const files = (n: number) => Array.from({ length: n }, (_, i) => `https://ik/payment-evidence/shot-${i}.png`);

const claim = (over: Partial<PaymentClaimValues> = {}): PaymentClaimValues => ({
  ...paymentClaimDefaults,
  ...over,
});

const issuesFor = (values: PaymentClaimValues) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`);
};

describe('makePaymentClaimSchema — uploaded evidence', () => {
  it('accepts one to five files for a screenshot or a bank statement', () => {
    for (const evidence_type of ['SCREENSHOT', 'BANK_STATEMENT'] as const) {
      expect(issuesFor(claim({ evidence_type, file_refs: files(1) }))).toEqual([]);
      expect(issuesFor(claim({ evidence_type, file_refs: files(PAYMENT_EVIDENCE_MAX_FILES) }))).toEqual([]);
    }
  });

  it('asks for at least one file, blanks not counting', () => {
    expect(issuesFor(claim({ file_refs: [] }))).toEqual(['file_refs:mweb.payment.claim.filesRequired']);
    expect(issuesFor(claim({ evidence_type: 'BANK_STATEMENT', file_refs: [''] }))).toEqual([
      'file_refs:mweb.payment.claim.filesRequired',
    ]);
  });

  it('refuses more files than the server keeps, and names the limit', () => {
    expect(issuesFor(claim({ file_refs: files(PAYMENT_EVIDENCE_MAX_FILES + 1) }))).toEqual([
      'file_refs:mweb.payment.claim.tooManyFiles',
    ]);
    const seen: Array<Record<string, string | number> | undefined> = [];
    makePaymentClaimSchema((key, options) => {
      seen.push(options?.vars);
      return key;
    }).safeParse(claim({ file_refs: files(6) }));
    expect(seen).toContainEqual({ max: PAYMENT_EVIDENCE_MAX_FILES });
  });

  it('ignores a typed transaction id while a file option is chosen', () => {
    expect(issuesFor(claim({ file_refs: files(1), transaction_id: 'not a ref!' }))).toEqual([]);
  });

  it('opens on the screenshot option with nothing attached, which cannot be submitted', () => {
    expect(paymentClaimDefaults).toEqual({ evidence_type: 'SCREENSHOT', file_refs: [], transaction_id: '' });
    expect(schema.safeParse(paymentClaimDefaults).success).toBe(false);
  });
});

describe('makePaymentClaimSchema — transaction id', () => {
  const byRef = (transaction_id: string) => claim({ evidence_type: 'TRANSACTION_ID', transaction_id });

  it('accepts a Razorpay payment id or a bank UTR, trimmed', () => {
    expect(issuesFor(byRef('pay_29QQoUBi66xm2f'))).toEqual([]);
    expect(schema.parse(byRef('  432112345678  ')).transaction_id).toBe('432112345678');
  });

  it('asks for the id when it is blank, spaces not counting', () => {
    expect(issuesFor(byRef(''))).toEqual(['transaction_id:mweb.payment.claim.transactionIdRequired']);
    expect(issuesFor(byRef('   '))).toEqual(['transaction_id:mweb.payment.claim.transactionIdRequired']);
  });

  it('refuses a reference the server would refuse', () => {
    for (const ref of ['pay_1', 'UTR: 4321 1234', 'x'.repeat(41)]) {
      expect(issuesFor(byRef(ref))).toEqual(['transaction_id:mweb.payment.claim.transactionIdInvalid']);
    }
  });

  it('does not ask for files when the reference is given', () => {
    expect(issuesFor(claim({ evidence_type: 'TRANSACTION_ID', transaction_id: 'pay_29QQoUBi66xm2f', file_refs: [] }))).toEqual([]);
  });
});

describe('paymentEvidenceAccepts', () => {
  it('takes only images for a screenshot', () => {
    expect(paymentEvidenceAccepts('SCREENSHOT', 'image/png')).toBe(true);
    expect(paymentEvidenceAccepts('SCREENSHOT', 'IMAGE/JPEG')).toBe(true);
    expect(paymentEvidenceAccepts('SCREENSHOT', 'application/pdf')).toBe(false);
    expect(paymentEvidenceAccepts('SCREENSHOT', 'video/mp4')).toBe(false);
  });

  it('takes images or a PDF for a bank statement, nothing else', () => {
    expect(paymentEvidenceAccepts('BANK_STATEMENT', 'image/heic')).toBe(true);
    expect(paymentEvidenceAccepts('BANK_STATEMENT', 'application/pdf')).toBe(true);
    expect(paymentEvidenceAccepts('BANK_STATEMENT', 'application/msword')).toBe(false);
    expect(paymentEvidenceAccepts('BANK_STATEMENT', 'application/pdfx')).toBe(false);
  });

  it('refuses a file whose type the device did not report', () => {
    for (const mime of ['', '   ', null, undefined]) {
      expect(paymentEvidenceAccepts('BANK_STATEMENT', mime)).toBe(false);
    }
  });

  it('exposes the picker patterns each option uses', () => {
    expect(PAYMENT_EVIDENCE_MIME_TYPES).toEqual({
      SCREENSHOT: ['image/*'],
      BANK_STATEMENT: ['image/*', 'application/pdf'],
    });
  });
});

describe('the option copy both apps render', () => {
  it('labels all three options, and hints the two that upload, from the mweb.payment.claim bundle', () => {
    expect(Object.keys(PAYMENT_EVIDENCE_LABEL_KEYS)).toEqual([...PAYMENT_EVIDENCE_TYPES]);
    expect(Object.keys(PAYMENT_EVIDENCE_HINT_KEYS)).toEqual(['SCREENSHOT', 'BANK_STATEMENT']);
    const keys = [...Object.values(PAYMENT_EVIDENCE_LABEL_KEYS), ...Object.values(PAYMENT_EVIDENCE_HINT_KEYS)];
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key.startsWith('mweb.payment.claim.')).toBe(true);
  });

  it('uploads to the folder the server keeps private', () => {
    expect(PAYMENT_EVIDENCE_FOLDER).toBe('payment-evidence');
  });
});

describe('paymentClaimInput', () => {
  it('sends the files, and no reference, for an uploaded option', () => {
    expect(
      paymentClaimInput('PAY-1', claim({ evidence_type: 'BANK_STATEMENT', file_refs: ['a.pdf', ''], transaction_id: 'pay_x123456' }), 'req-1'),
    ).toEqual({
      payment_doc_id: 'PAY-1',
      evidence_type: 'BANK_STATEMENT',
      file_refs: ['a.pdf'],
      transaction_id: null,
      client_request_id: 'req-1',
    });
  });

  it('sends the trimmed reference, and no files picked before switching, for a transaction id', () => {
    expect(
      paymentClaimInput('PAY-1', claim({ evidence_type: 'TRANSACTION_ID', file_refs: ['old.png'], transaction_id: ' pay_29QQoUBi66xm2f ' }), 'req-2'),
    ).toEqual({
      payment_doc_id: 'PAY-1',
      evidence_type: 'TRANSACTION_ID',
      file_refs: null,
      transaction_id: 'pay_29QQoUBi66xm2f',
      client_request_id: 'req-2',
    });
  });
});
