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

const messagesOf = (input: unknown) => {
  const result = createUserSchema.safeParse(input);
  return result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');
};

describe('createUserSchema', () => {
  it('rejects empty required fields', () => {
    const msg = messagesOf({
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
    });
    expect(msg).toMatch(/first name/i);
    expect(msg).toMatch(/last name/i);
    expect(msg).toMatch(/phone/i);
    expect(msg).toMatch(/password/i);
    expect(msg).toMatch(/role/i);
    expect(msg).toMatch(/date of birth/i);
  });

  it('rejects phone numbers with alphabetic characters', () => {
    expect(messagesOf({ ...validForm, phone_number: 'abc1234' })).toMatch(/digits/i);
  });

  it('rejects names with special characters', () => {
    expect(messagesOf({ ...validForm, first_name: 'Jane@!' })).toMatch(/first name/i);
  });

  it('rejects passwords shorter than 8 characters', () => {
    expect(messagesOf({ ...validForm, password: 'short' })).toMatch(/8 characters/i);
  });

  it('rejects an empty roles array', () => {
    expect(messagesOf({ ...validForm, roles: [] })).toMatch(/role/i);
  });

  it('accepts a fully valid form', () => {
    const parsed = createUserSchema.parse(validForm);
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
