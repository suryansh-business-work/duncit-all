import { describe, expect, it } from 'vitest';
import { toUpdateUserInput, userProfileSchema } from './user-profile.form';

const valid = {
  first_name: 'Jane',
  last_name: 'Doe',
  email: 'jane@example.com',
  phone_extension: '+91',
  phone_number: '9876543210',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560102',
  zone: 'HSR',
  assigned_city: '',
  assigned_zones: '',
  bio: '',
  profile_photo: '',
  status: 'ACTIVE' as const,
};

const messages = (input: unknown) => {
  const result = userProfileSchema.safeParse(input);
  return result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');
};

describe('userProfileSchema', () => {
  it('rejects names with special characters', () => {
    expect(messages({ ...valid, first_name: 'Jane!@' })).toMatch(/first name/i);
  });

  it('rejects phone with letters', () => {
    expect(messages({ ...valid, phone_number: 'abc123' })).toMatch(/digits/i);
  });

  it('rejects an invalid status', () => {
    expect(messages({ ...valid, status: 'BOGUS' as any })).toMatch(/status/i);
  });

  it('accepts an optional email left blank', () => {
    const parsed = userProfileSchema.parse({ ...valid, email: '' });
    expect(parsed.email).toBe('');
  });

  it('accepts state and pincode left blank', () => {
    const parsed = userProfileSchema.parse({ ...valid, state: '', pincode: '' });
    expect(parsed.state).toBe('');
    expect(parsed.pincode).toBe('');
  });

  it('rejects a pincode with invalid characters', () => {
    expect(messages({ ...valid, pincode: '!!' })).toMatch(/pincode/i);
  });
});

describe('toUpdateUserInput', () => {
  it('splits assigned_zones on commas', () => {
    const input = toUpdateUserInput({ ...valid, assigned_zones: ' HSR , Indiranagar , Whitefield ' });
    expect(input.assigned_zones).toEqual(['HSR', 'Indiranagar', 'Whitefield']);
  });

  it('omits empty optional fields', () => {
    const input = toUpdateUserInput({ ...valid, email: '', city: '', zone: '', bio: '', profile_photo: '' });
    expect(input.email).toBeUndefined();
    expect(input.city).toBeUndefined();
    expect(input.bio).toBeUndefined();
  });

  it('includes email when provided', () => {
    const input = toUpdateUserInput(valid);
    expect(input.email).toBe('jane@example.com');
  });

  it('emits state and pincode when set, omits them when blank', () => {
    const filled = toUpdateUserInput(valid);
    expect(filled.state).toBe('Karnataka');
    expect(filled.pincode).toBe('560102');
    const blank = toUpdateUserInput({ ...valid, state: '', pincode: '' });
    expect(blank.state).toBeUndefined();
    expect(blank.pincode).toBeUndefined();
  });
});
