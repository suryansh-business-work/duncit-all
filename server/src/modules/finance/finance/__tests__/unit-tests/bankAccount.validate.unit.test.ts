import { GraphQLError } from 'graphql';
import { validatedBankAccountInput } from '../../bankAccount';

/**
 * Bank details as a venue owner, a host or staff typed them — or as an MCP
 * tool sent them. Only what is filled in is held to a format (staff register
 * a venue before its bank is known); details re-sent unchanged from the
 * stored record pass, so a record saved before these checks stays editable.
 */

function refusal(run: () => unknown): GraphQLError {
  try {
    run();
  } catch (error) {
    if (error instanceof GraphQLError) return error;
    throw error;
  }
  throw new Error('expected a refusal');
}

describe('validatedBankAccountInput — well-formed details', () => {
  it('accepts a UPI payout and normalises it', () => {
    expect(validatedBankAccountInput({ payout_method: 'upi', upi_id: ' asha@okhdfc ', account_holder_name: ' Asha Rao ' })).toEqual({
      payout_method: 'UPI',
      account_holder_name: 'Asha Rao',
      account_number: '',
      ifsc_code: '',
      upi_id: 'asha@okhdfc',
    });
  });

  it('accepts a bank transfer with a lower-case IFSC', () => {
    expect(validatedBankAccountInput({ payout_method: 'NEFT', account_number: '001122334455', ifsc_code: 'hdfc0001234' })).toMatchObject({
      payout_method: 'NEFT',
      account_number: '001122334455',
      ifsc_code: 'HDFC0001234',
    });
  });

  it('accepts no bank at all — nothing here is required', () => {
    expect(validatedBankAccountInput({})).toMatchObject({ payout_method: '', account_number: '' });
    expect(validatedBankAccountInput(null).upi_id).toBe('');
  });

  it('accepts an account holder name of exactly 120 characters', () => {
    expect(validatedBankAccountInput({ account_holder_name: 'a'.repeat(120) }).account_holder_name).toHaveLength(120);
  });
});

describe('validatedBankAccountInput — malformed details are refused', () => {
  it.each([
    ['an unknown payout method', { payout_method: 'CHEQUE' }, 'Payout method must be one of: UPI, IMPS, NEFT'],
    ['an account number with letters', { account_number: '12AB5678' }, 'Account number must be 6 to 18 digits'],
    ['an account number too short', { account_number: '12345' }, 'Account number must be 6 to 18 digits'],
    ['an account number too long', { account_number: '1'.repeat(19) }, 'Account number must be 6 to 18 digits'],
    ['an IFSC without the 0', { ifsc_code: 'HDFC1001234' }, 'IFSC must be 11 characters, such as HDFC0001234'],
    ['a UPI ID without a handle', { upi_id: 'asha' }, 'UPI ID must look like name@bank'],
    ['a holder name over 120 characters', { account_holder_name: 'a'.repeat(121) }, 'Account holder name must be 120 characters or fewer'],
  ])('refuses %s', (_label, input, message) => {
    const error = refusal(() => validatedBankAccountInput(input));
    expect(error.extensions).toEqual({ code: 'BAD_USER_INPUT', errors: [message] });
    expect(error.message).toBe(message);
  });

  it('names every problem at once', () => {
    const error = refusal(() => validatedBankAccountInput({ payout_method: 'cash', account_number: '1', ifsc_code: 'x', upi_id: 'y' }));
    expect(error.extensions.errors).toHaveLength(4);
    expect(error.message.split('. ')).toHaveLength(4);
  });
});

describe('validatedBankAccountInput — the stored record', () => {
  const legacy = { payout_method: 'IMPS' as const, account_number: '12 34', ifsc_code: 'OLD', upi_id: '', account_holder_name: 'Ravi' };

  it('lets details saved before these checks be re-sent unchanged, so the rest of the record can be edited', () => {
    expect(validatedBankAccountInput({ ...legacy, ifsc_code: 'old ' }, legacy)).toMatchObject({ account_number: '12 34', ifsc_code: 'OLD' });
  });

  it('holds changed details to the format even when the old ones were malformed', () => {
    expect(refusal(() => validatedBankAccountInput({ ...legacy, account_number: '12 345' }, legacy)).message).toContain('Account number');
  });

  it('checks fresh details against nothing stored', () => {
    expect(refusal(() => validatedBankAccountInput(legacy, null)).extensions.errors).toEqual([
      'Account number must be 6 to 18 digits',
      'IFSC must be 11 characters, such as HDFC0001234',
    ]);
  });
});
