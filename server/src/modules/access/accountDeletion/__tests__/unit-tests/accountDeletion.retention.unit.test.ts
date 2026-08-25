import { Schema } from 'mongoose';
import {
  DELETED_USER_NAME,
  isRetainedModel,
  redactionFor,
  retentionReason,
} from '../../accountDeletion.retention';
import { purgeKind, purgePlan } from '../../accountDeletion.purge';

/*
  The one decision in this feature that cannot be re-derived from a schema:
  which records outlive the account. Getting it wrong deletes a paid invoice or
  an audit trail about somebody else, so it is asserted rather than assumed.
*/
describe('account deletion retention', () => {
  it('keeps the records the platform is not free to delete', () => {
    for (const model of [
      'Payment',
      'EventTicket',
      'WalletTransaction',
      'WalletWithdrawal',
      'CoinTransaction',
      'GiftCard',
      'UserChangeLog',
    ]) {
      expect(isRetainedModel(model)).toBe(true);
      expect(retentionReason(model)).not.toBe('');
    }
  });

  it('leaves everything else deletable', () => {
    expect(isRetainedModel('AddressBook')).toBe(false);
    expect(retentionReason('AddressBook')).toBe('');
  });

  it('erases the person from a retained payment but keeps the money', () => {
    const set = redactionFor('Payment', 'user_id');
    expect(set).toMatchObject({ user_name: DELETED_USER_NAME, user_email: '' });
    // The figures and the invoice number are the reason the row is kept.
    expect(set).not.toHaveProperty('total');
    expect(set).not.toHaveProperty('invoice_no');
  });

  it('erases the bank details a withdrawal was paid to', () => {
    expect(redactionFor('WalletWithdrawal', 'user_id')).toMatchObject({
      account_number: '',
      ifsc_code: '',
      upi_id: '',
    });
  });

  it('redacts a reference that names nobody as null, not as an empty edit', () => {
    // A coin ledger row is an id, an amount and a date. There is nothing
    // personal on it to erase, and it must not be mistaken for one that needs
    // no protection.
    expect(redactionFor('CoinTransaction', 'user_id')).toBeNull();
    expect(isRetainedModel('CoinTransaction')).toBe(true);
  });

  it('plans a retained reference as a redaction whatever its schema says', () => {
    // A plain scalar ref would otherwise plan as DELETE_DOCUMENTS — retention
    // has to answer before the schema does.
    const schema = new Schema({ user_id: { type: Schema.Types.ObjectId, ref: 'User' } });
    expect(purgePlan('Payment', schema, 'user_id').kind).toBe('REDACT_RECORDS');
    expect(purgePlan('AddressBook', schema, 'user_id').kind).toBe('DELETE_DOCUMENTS');
  });

  it('labels a retained reference for the console without loading the model', () => {
    expect(purgeKind('Payment', 'user_id')).toBe('REDACT_RECORDS');
    // An unregistered model is not retained and falls back to the safe reading
    // the console already showed.
    expect(purgeKind('NotAModelAnybodyRegistered', 'user_id')).toBe('DELETE_DOCUMENTS');
  });
});
