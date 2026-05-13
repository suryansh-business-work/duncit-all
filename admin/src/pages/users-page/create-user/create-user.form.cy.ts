import { describe, expect, it } from 'vitest';
import { createUserSchema, toCreateUserInput } from './create-user.form';

const validForm = {
  first_name: 'Jane',
  last_name: 'Doe',
  email: 'jane@example.com',
  phone_extension: '+91',
  phone_number: '9876543210',
  password: 'Sup3rSecret!',
  dob: '1995-06-15',
  roles: ['admin'],
  city: 'Bengaluru',
  zone: 'HSR',
};

describe('createUserSchema', () => {
  it('rejects empty required fields', async () => {
    const error = await createUserSchema
      .validate(
        {
          first_name: '',
          last_name: '',
          email: '',
          phone_extension: '',
          phone_number: '',
          password: '',
          dob: '',
          roles: [],
          city: '',
          zone: '',
        },
        { abortEarly: false },
      )
      .catch((e) => e);
    expect(error.name).toBe('ValidationError');
    const msg = error.errors.join(' ');
    expect(msg).toMatch(/first name/i);
    expect(msg).toMatch(/last name/i);
    expect(msg).toMatch(/phone/i);
    expect(msg).toMatch(/password/i);
    expect(msg).toMatch(/role/i);
    expect(msg).toMatch(/date of birth/i);
  });

  it('rejects phone numbers with alphabetic characters', async () => {
    const error = await createUserSchema
      .validate({ ...validForm, phone_number: 'abc1234' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.name).toBe('ValidationError');
    expect(error.errors.join(' ')).toMatch(/digits/i);
  });

  it('rejects names with special characters', async () => {
    const error = await createUserSchema
      .validate({ ...validForm, first_name: 'Jane@!' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.name).toBe('ValidationError');
    expect(error.errors.join(' ')).toMatch(/first name/i);
  });

  it('rejects passwords shorter than 8 characters', async () => {
    const error = await createUserSchema
      .validate({ ...validForm, password: 'short' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.name).toBe('ValidationError');
    expect(error.errors.join(' ')).toMatch(/8 characters/i);
  });

  it('rejects an empty roles array', async () => {
    const error = await createUserSchema
      .validate({ ...validForm, roles: [] }, { abortEarly: false })
      .catch((e) => e);
    expect(error.name).toBe('ValidationError');
    expect(error.errors.join(' ')).toMatch(/role/i);
  });

  it('accepts a fully valid form', async () => {
    const parsed = await createUserSchema.validate(validForm, { abortEarly: false });
    expect(parsed.first_name).toBe('Jane');
    expect(parsed.phone_number).toBe('9876543210');
    expect(parsed.email).toBe('jane@example.com');
  });
});

describe('toCreateUserInput', () => {
  it('produces a payload aligned with the GraphQL mutation', () => {
    const input = toCreateUserInput(validForm);
    expect(input.first_name).toBe('Jane');
    expect(input.last_name).toBe('Doe');
    expect(input.email).toBe('jane@example.com');
    expect(input.phone_extension).toBe('+91');
    expect(input.phone_number).toBe('9876543210');
    expect(input.roles).toEqual(['admin']);
    expect(new Date(input.dob).toISOString()).toMatch(/^1995-06-15/);
  });

  it('omits empty optional fields', () => {
    const input = toCreateUserInput({ ...validForm, email: '', city: '', zone: '' });
    expect(input.email).toBeUndefined();
    expect(input.city).toBeUndefined();
    expect(input.zone).toBeUndefined();
  });
});
