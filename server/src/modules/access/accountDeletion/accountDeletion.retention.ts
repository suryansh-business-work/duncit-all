/**
 * The records that OUTLIVE the account, and what is erased from them.
 *
 * Erasure and record-keeping pull in opposite directions, and the scan in
 * `accountDeletion.trace.ts` has no way to tell them apart: it reads a schema,
 * sees `Payment.user_id` is a scalar `ref: 'User'`, and concludes the document
 * is the member's and can go. For a saved address that is right. For a paid
 * invoice it is not — the money moved, the GST was collected against an invoice
 * number, a host was settled out of it, and none of that stops being true
 * because the buyer left.
 *
 * Deleting them anyway is the bug this list exists to stop. A member who bought
 * a gift card somebody ELSE still holds took the card with them; a Club Admin
 * who left took the audit trail of every account they ever touched; a host's
 * payout report lost the tickets it was calculated from.
 *
 * So a retained model keeps its documents AND keeps `user_id` — an ObjectId
 * pointing at an account that no longer exists is a pseudonymous key, not
 * personal data, and it is what keeps the ledger joinable. What goes is the
 * personal data ON those documents: the name, the email, the phone, the bank
 * details, replaced by `DELETED_USER_NAME` where a person is still shown.
 */

/**
 * What a retained record shows where it used to show a name.
 *
 * Written INTO the document at purge time rather than resolved at render time:
 * the account it would resolve against is gone, and every table, invoice and
 * export that already reads the snapshot then keeps working untouched.
 */
export const DELETED_USER_NAME = 'Deleted user';

/**
 * Models whose documents survive a purge, and why.
 *
 * Keyed by mongoose model name — retention is a property of the RECORD, so
 * every reference into one of these is retained however the member appears on
 * it. The reason is carried here rather than in a comment because the console
 * shows it to whoever is deciding.
 */
export const RETAINED_MODELS: Readonly<Record<string, string>> = {
  Payment: 'Payment record — carries the invoice number the GST was filed under.',
  EventTicket: 'The booking a completed pod was settled on.',
  WalletTransaction: 'Payout ledger — the other side of money already paid out.',
  WalletWithdrawal: 'Payout record for money that left the platform.',
  PaymentRelease: 'Settlement record for a pod that was paid out.',
  CoinTransaction: 'Duncit Coin ledger.',
  GiftCard: 'A bearer instrument somebody else may still be holding.',
  GiftCardTransaction: 'Gift card ledger.',
  Expense: 'Accounting record.',
  PodExpense: 'Accounting record for somebody else’s pod.',
  UserChangeLog: 'Audit trail — including of changes made to OTHER accounts.',
  PodAuditLog: 'Audit trail for pods that still exist.',
};

export function isRetainedModel(modelName: string): boolean {
  return Object.hasOwn(RETAINED_MODELS, modelName);
}

/** Why this record is kept, for the console. Empty when it is not retained. */
export function retentionReason(modelName: string): string {
  return RETAINED_MODELS[modelName] ?? '';
}

/**
 * The personal data to erase from a retained record, per REFERENCE.
 *
 * Per reference and not per model, because a document can name more than one
 * person: `PaymentRelease.reviewed_by` is the Finance reviewer, and blanking
 * the host's name because the REVIEWER left would corrupt somebody else's
 * settlement. Only the fields describing the member behind THIS reference are
 * listed, and a reference with nothing personal on it — a ledger row that is
 * an id, an amount and a date — is absent rather than mapped to an empty
 * object.
 */
export const REDACTIONS: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  'Payment.user_id': {
    user_name: DELETED_USER_NAME,
    user_email: '',
    user_phone: null,
    billing_address: '',
    'billing.name': DELETED_USER_NAME,
    'billing.email': '',
    'billing.phone': '',
    'billing.gstin': '',
    'billing.line1': '',
    'billing.line2': '',
    'billing.landmark': '',
  },
  'EventTicket.user_id': {
    'snapshot.user_name': DELETED_USER_NAME,
    'snapshot.user_email': '',
    qr_token: '',
  },
  'WalletWithdrawal.user_id': {
    beneficiary_name: DELETED_USER_NAME,
    beneficiary_email: '',
    account_holder_name: DELETED_USER_NAME,
    account_number: '',
    ifsc_code: '',
    upi_id: '',
  },
};

/** The `$set` that erases one member from one retained reference, or null when
 * that reference carries no personal data to erase. */
export function redactionFor(
  modelName: string,
  fieldPath: string
): Readonly<Record<string, unknown>> | null {
  return REDACTIONS[`${modelName}.${fieldPath}`] ?? null;
}

/*
  The name a ledger row shows when the account behind it is gone lives with the
  other admin-table helpers, in `@utils/admin-ledger` — `userNameOrDeleted`.
  It reads DELETED_USER_NAME from here, which stays the one definition of what
  a purged member is called.
*/
