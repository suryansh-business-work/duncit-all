import { describe, expect, it } from 'vitest';
import {
  accountEditSchema,
  accountEditInitialValues,
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
});

describe('toUpdateProfileInput', () => {
  it('round-trips the cast values', () => {
    const out = toUpdateProfileInput(valid);
    expect(out.first_name).toBe('Jane');
    expect(out.phone_number).toBe('9876543210');
  });
});
