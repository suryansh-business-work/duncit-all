import { describe, expect, it } from 'vitest';
import {
  accountEditSchema,
  accountEditInitialValues,
  toDobInput,
  toUpdateProfileInput,
} from './account-edit.form';

const valid = accountEditInitialValues({
  first_name: 'Jane',
  last_name: 'Doe',
  phone_number: '9876543210',
  city: 'Bengaluru',
  zone: 'HSR',
});

describe('accountEditSchema', () => {
  it('rejects empty first_name', async () => {
    const error = await accountEditSchema
      .validate({ ...valid, first_name: '' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/first name/i);
  });

  it('rejects first_name with special chars', async () => {
    const error = await accountEditSchema
      .validate({ ...valid, first_name: 'Jane!' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/first name/i);
  });

  it('rejects phone with letters', async () => {
    const error = await accountEditSchema
      .validate({ ...valid, phone_number: 'abc' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/digits/i);
  });

  it('allows empty whatsapp number', async () => {
    await expect(accountEditSchema.validate({ ...valid, whatsapp_number: '' })).resolves.toBeTruthy();
  });

  it('rejects whatsapp number with non-digits', async () => {
    const error = await accountEditSchema
      .validate({ ...valid, whatsapp_number: 'abc' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/whatsapp/i);
  });

  it('requires whatsapp_extension when whatsapp_number is set', async () => {
    const error = await accountEditSchema
      .validate(
        { ...valid, whatsapp_extension: '', whatsapp_number: '9876543210' },
        { abortEarly: false },
      )
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/whatsapp/i);
  });

  it('accepts a fully valid payload', async () => {
    await expect(accountEditSchema.validate(valid)).resolves.toBeTruthy();
  });

  it('allows an empty dob (no change) and a valid past date (bug 8)', async () => {
    await expect(accountEditSchema.validate({ ...valid, dob: '' })).resolves.toBeTruthy();
    await expect(
      accountEditSchema.validate({ ...valid, dob: '1990-01-02' }),
    ).resolves.toBeTruthy();
  });

  it('rejects a malformed or future dob (bug 8)', async () => {
    const bad = await accountEditSchema
      .validate({ ...valid, dob: '02/01/1990' }, { abortEarly: false })
      .catch((e) => e);
    expect(bad.errors.join(' ')).toMatch(/YYYY-MM-DD/);
    const future = await accountEditSchema
      .validate({ ...valid, dob: '3000-01-01' }, { abortEarly: false })
      .catch((e) => e);
    expect(future.errors.join(' ')).toMatch(/past date/i);
  });
});

describe('toDobInput', () => {
  it('slices ISO dates and rejects junk (bug 8)', () => {
    expect(toDobInput('1995-06-15T00:00:00.000Z')).toBe('1995-06-15');
    expect(toDobInput('1995-06-15')).toBe('1995-06-15');
    expect(toDobInput(null)).toBe('');
    expect(toDobInput('nope')).toBe('');
  });
});

describe('toUpdateProfileInput', () => {
  it('round-trips the cast values', () => {
    const out = toUpdateProfileInput(valid);
    expect(out.first_name).toBe('Jane');
    expect(out.phone_number).toBe('9876543210');
  });

  it('omits an empty dob but forwards a provided one (bug 8)', () => {
    expect(toUpdateProfileInput(valid).dob).toBeUndefined();
    expect(toUpdateProfileInput({ ...valid, dob: '1990-01-02' }).dob).toBe('1990-01-02');
  });
});
