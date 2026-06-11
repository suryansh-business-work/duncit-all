import { describe, expect, it } from 'vitest';
import { subYears, format } from 'date-fns';
// Import via the top-level barrel so both forms/host.form.ts and the schema module are covered.
import {
  hostStep1Schema,
  hostStep2Schema,
  hostStep3Schema,
  hostEditSchema,
  hostCreateSchema,
  hostEditInitialValues,
  hostCreateInitialValues,
  toHostEditVariables,
  toHostCreateVariables,
} from '../host.form';

const adultDob = format(subYears(new Date(), 30), 'yyyy-MM-dd');

const step1 = { full_name: 'Asha Rao', email: 'asha@duncit.com', phone: '+919876543210', dob: adultDob };
const step2 = { aadhar_number: '123412341234', pan_number: 'ABCDE1234F', passport_photo_url: 'x' };
const step3 = {
  police_verification_url: 'x',
  full_address: '123 Main Street',
  bank_account: { payout_method: 'UPI', account_holder_name: 'Asha', account_number: '', ifsc_code: '', upi_id: 'asha@okhdfc' },
  tags: ['a'],
};

describe('host step schemas', () => {
  it('validates step1 and rejects bad email/phone/dob', async () => {
    await expect(hostStep1Schema.isValid(step1)).resolves.toBe(true);
    await expect(hostStep1Schema.isValid({ ...step1, email: 'bad' })).resolves.toBe(false);
    await expect(hostStep1Schema.isValid({ ...step1, phone: 'abc' })).resolves.toBe(false);
    await expect(
      hostStep1Schema.isValid({ ...step1, dob: format(subYears(new Date(), 5), 'yyyy-MM-dd') }),
    ).resolves.toBe(false);
  });

  it('validates step2 aadhar/pan', async () => {
    await expect(hostStep2Schema.isValid(step2)).resolves.toBe(true);
    await expect(hostStep2Schema.isValid({ ...step2, aadhar_number: '12' })).resolves.toBe(false);
    await expect(hostStep2Schema.isValid({ ...step2, pan_number: 'bad' })).resolves.toBe(false);
  });

  it('validates step3', async () => {
    await expect(hostStep3Schema.isValid(step3)).resolves.toBe(true);
    await expect(hostStep3Schema.isValid({ ...step3, full_address: 'x' })).resolves.toBe(false);
  });

  it('validates edit and create wrappers', async () => {
    await expect(
      hostEditSchema.isValid({ step1, step2, step3, status: 'APPROVED' }),
    ).resolves.toBe(true);
    await expect(
      hostEditSchema.isValid({ step1, step2, step3, status: 'BOGUS' }),
    ).resolves.toBe(false);
    await expect(
      hostCreateSchema.isValid({ target_user_id: 'u1', step1, step2, step3 }),
    ).resolves.toBe(true);
    await expect(
      hostCreateSchema.isValid({ target_user_id: '', step1, step2, step3 }),
    ).resolves.toBe(false);
  });
});

describe('host initial values + variable mappers', () => {
  it('builds blank edit values from null', () => {
    const values = hostEditInitialValues(null);
    expect(values.step1.full_name).toBe('');
    expect(values.step1.dob).toBe('');
    expect(values.status).toBe('APPROVED');
  });

  it('builds edit values from a host, formatting dob', () => {
    const values = hostEditInitialValues({
      full_name: 'Asha',
      email: 'asha@duncit.com',
      phone: '+91',
      dob: '1990-05-01T00:00:00.000Z',
      status: 'SUBMITTED',
      bank_account: { payout_method: 'UPI', upi_id: 'asha@okhdfc' },
      tags: ['vip'],
    });
    expect(values.step1.dob).toBe('1990-05-01');
    expect(values.status).toBe('SUBMITTED');
    expect(values.step3.tags).toEqual(['vip']);
  });

  it('maps edit and create variables', () => {
    const edit = toHostEditVariables({ step1, step2, step3, status: 'APPROVED' } as never);
    expect(edit.status).toBe('APPROVED');
    expect(edit.step1.full_name).toBe('Asha Rao');

    const created = toHostCreateVariables({ ...hostCreateInitialValues, target_user_id: 'u1', step1, step2, step3 } as never, true);
    expect(created.submit).toBe(true);
    expect(created.target_user_id).toBe('u1');
    expect(toHostCreateVariables({ ...hostCreateInitialValues, target_user_id: 'u1', step1, step2, step3 } as never, false).submit).toBe(false);
  });
});
