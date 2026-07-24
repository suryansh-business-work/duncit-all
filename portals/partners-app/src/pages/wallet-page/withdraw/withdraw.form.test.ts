import { describe, expect, it } from 'vitest';
import { buildWithdrawInput, buildWithdrawSchema } from './withdraw.form';
import { blankWithdrawValues } from './withdraw.types';

describe('buildWithdrawSchema', () => {
  const schema = buildWithdrawSchema(500);

  it('rejects a non-positive or over-max amount', () => {
    expect(schema.safeParse({ ...blankWithdrawValues, amount: '0', upi_id: 'a@ok' }).success).toBe(
      false,
    );
    expect(
      schema.safeParse({ ...blankWithdrawValues, amount: '600', upi_id: 'a@ok' }).success,
    ).toBe(false);
  });

  it('requires a UPI id for the UPI method', () => {
    expect(schema.safeParse({ ...blankWithdrawValues, amount: '100' }).success).toBe(false);
    expect(schema.safeParse({ ...blankWithdrawValues, amount: '100', upi_id: 'a@ok' }).success).toBe(
      true,
    );
  });

  it('requires account number + IFSC for bank methods', () => {
    expect(
      schema.safeParse({ ...blankWithdrawValues, amount: '100', payout_method: 'IMPS' }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...blankWithdrawValues,
        amount: '100',
        payout_method: 'NEFT',
        account_number: '123456',
        ifsc_code: 'HDFC0001',
      }).success,
    ).toBe(true);
  });
});

describe('buildWithdrawInput', () => {
  it('coerces the amount and drops empty optional fields', () => {
    expect(
      buildWithdrawInput({
        ...blankWithdrawValues,
        amount: '250',
        payout_method: 'UPI',
        upi_id: ' a@ok ',
      }),
    ).toEqual({
      amount: 250,
      payout_method: 'UPI',
      upi_id: 'a@ok',
      account_holder_name: undefined,
      account_number: undefined,
      ifsc_code: undefined,
    });
  });
});
