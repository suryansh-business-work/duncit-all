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

const isValid = (schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) =>
  schema.safeParse(value).success;

describe('host step schemas', () => {
  it('validates step1 and rejects bad email/phone/dob', () => {
    expect(isValid(hostStep1Schema, step1)).toBe(true);
    expect(isValid(hostStep1Schema, { ...step1, email: 'bad' })).toBe(false);
    expect(isValid(hostStep1Schema, { ...step1, phone: 'abc' })).toBe(false);
    expect(
      isValid(hostStep1Schema, { ...step1, dob: format(subYears(new Date(), 5), 'yyyy-MM-dd') }),
    ).toBe(false);
  });

  it('validates step2 aadhar/pan', () => {
    expect(isValid(hostStep2Schema, step2)).toBe(true);
    expect(isValid(hostStep2Schema, { ...step2, aadhar_number: '12' })).toBe(false);
    expect(isValid(hostStep2Schema, { ...step2, pan_number: 'bad' })).toBe(false);
  });

  it('validates step3', () => {
    expect(isValid(hostStep3Schema, step3)).toBe(true);
    expect(isValid(hostStep3Schema, { ...step3, full_address: 'x' })).toBe(false);
  });

  it('validates edit and create wrappers', () => {
    expect(isValid(hostEditSchema, { step1, step2, step3, status: 'APPROVED' })).toBe(true);
    expect(isValid(hostEditSchema, { step1, step2, step3, status: 'BOGUS' })).toBe(false);
    expect(isValid(hostCreateSchema, { target_user_id: 'u1', step1, step2, step3 })).toBe(true);
    expect(isValid(hostCreateSchema, { target_user_id: '', step1, step2, step3 })).toBe(false);
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

  it('hydrates and maps host categories (ids only) for the edit form', () => {
    const values = hostEditInitialValues({
      status: 'APPROVED',
      host_categories: [
        {
          super_category_id: 's1', category_id: 'c1', sub_category_id: 'x1',
          super_category_name: 'For You', category_name: 'Sports', sub_category_name: 'Badminton',
          request_no: 'HOSTREQ-1',
        },
        // Ids present but names/request_no missing → fields default to ''.
        { super_category_id: 's2', category_id: 'c2', sub_category_id: 'x2' },
        // Incomplete triple is dropped during hydration.
        { super_category_id: 's3', category_id: '', sub_category_id: '' },
      ],
    });
    expect(values.categories).toHaveLength(2);
    expect(values.categories?.[0]).toMatchObject({ sub_category_name: 'Badminton', request_no: 'HOSTREQ-1' });
    expect(values.categories?.[1]).toMatchObject({
      super_category_id: 's2', super_category_name: '', category_name: '', sub_category_name: '', request_no: '',
    });

    const mapped = toHostEditVariables({ step1, step2, step3, status: 'APPROVED', categories: values.categories } as never);
    expect(mapped.categories).toEqual([
      { super_category_id: 's1', category_id: 'c1', sub_category_id: 'x1' },
      { super_category_id: 's2', category_id: 'c2', sub_category_id: 'x2' },
    ]);
  });

  it('maps edit and create variables', () => {
    const edit = toHostEditVariables({ step1, step2, step3, status: 'APPROVED' } as never);
    expect(edit.status).toBe('APPROVED');
    expect(edit.step1.full_name).toBe('Asha Rao');
    expect(edit.categories).toEqual([]);

    const created = toHostCreateVariables({ ...hostCreateInitialValues, target_user_id: 'u1', step1, step2, step3 } as never, true);
    expect(created.submit).toBe(true);
    expect(created.target_user_id).toBe('u1');
    expect(toHostCreateVariables({ ...hostCreateInitialValues, target_user_id: 'u1', step1, step2, step3 } as never, false).submit).toBe(false);
  });
});
