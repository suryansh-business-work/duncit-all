import { describe, expect, it } from 'vitest';
import {
  hostCreateInitialValues,
  hostCreateSchema,
  hostEditInitialValues,
  hostEditSchema,
  hostStep1Schema,
  hostStep2Schema,
  hostStep3Schema,
  toHostCreateVariables,
  toHostEditVariables,
} from './host.form';

const validStep1 = {
  full_name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+919876543210',
  dob: '1995-05-10',
};

const validStep2 = {
  aadhar_number: '123456789012',
  pan_number: 'ABCDE1234F',
  passport_photo_url: 'https://cdn.example.com/jane.jpg',
};

const validStep3 = {
  police_verification_url: 'https://cdn.example.com/police.pdf',
  full_address: '221B Baker Street, London',
  bank_account: {
    payout_method: 'IMPS' as const,
    account_holder_name: 'Jane Doe',
    account_number: '123456789012',
    ifsc_code: 'HDFC0001234',
    upi_id: '',
  },
  tags: ['premium'],
};

describe('host step schemas', () => {
  it('rejects names containing special characters', async () => {
    const error = await hostStep1Schema
      .validate({ ...validStep1, full_name: 'Jane@!' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.name).toBe('ValidationError');
    expect(error.errors.join(' ')).toMatch(/full name/i);
  });

  it('rejects phone with alphabetic characters', async () => {
    const error = await hostStep1Schema
      .validate({ ...validStep1, phone: '98abc7' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.name).toBe('ValidationError');
    expect(error.errors.join(' ')).toMatch(/digits/i);
  });

  it('rejects Aadhar that is not 12 digits', async () => {
    const error = await hostStep2Schema
      .validate({ ...validStep2, aadhar_number: '1234' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/12 digit/i);
  });

  it('rejects PAN with invalid format', async () => {
    const error = await hostStep2Schema
      .validate({ ...validStep2, pan_number: 'BADPAN' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/PAN/i);
  });

  it('rejects empty police verification url', async () => {
    const error = await hostStep3Schema
      .validate({ ...validStep3, police_verification_url: '' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/police verification/i);
  });
});

describe('hostEditSchema', () => {
  it('rejects an invalid status enum', async () => {
    const error = await hostEditSchema
      .validate(
        { step1: validStep1, step2: validStep2, step3: validStep3, status: 'INVALID' as any },
        { abortEarly: false },
      )
      .catch((e) => e);
    expect(error.name).toBe('ValidationError');
    expect(error.errors.join(' ')).toMatch(/status/i);
  });

  it('accepts a valid edit payload', async () => {
    const parsed = await hostEditSchema.validate(
      { step1: validStep1, step2: validStep2, step3: validStep3, status: 'APPROVED' as const },
      { abortEarly: false },
    );
    expect(parsed.status).toBe('APPROVED');
  });
});

describe('host mappers', () => {
  it('hostEditInitialValues handles null host', () => {
    const values = hostEditInitialValues(null);
    expect(values.step1.full_name).toBe('');
    expect(values.status).toBe('APPROVED');
  });

  it('toHostEditVariables strips unknown keys', () => {
    const vars = toHostEditVariables({
      step1: validStep1,
      step2: validStep2,
      step3: validStep3,
      status: 'APPROVED',
      // @ts-expect-error — extra field is dropped
      junk: 'remove me',
    });
    expect((vars as any).junk).toBeUndefined();
    expect(vars.step1.email).toBe('jane@example.com');
  });

  it('toHostCreateVariables passes submit flag through', () => {
    const vars = toHostCreateVariables(
      { ...hostCreateInitialValues, target_user_id: 'u1', step1: validStep1, step2: validStep2, step3: validStep3 },
      true,
    );
    expect(vars.submit).toBe(true);
    expect(vars.target_user_id).toBe('u1');
  });

  it('hostCreateSchema requires a target_user_id', async () => {
    const error = await hostCreateSchema
      .validate(
        { target_user_id: '', step1: validStep1, step2: validStep2, step3: validStep3 },
        { abortEarly: false },
      )
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/select a user/i);
  });
});
