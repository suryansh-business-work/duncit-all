import { registerSchema, googleSignupSchema } from '../../user.validator';

describe('auth validators — simplified signup contract', () => {
  it('registerSchema accepts a payload with no phone and no last_name', async () => {
    const value = await registerSchema.validate({
      first_name: 'Riya',
      email: 'riya@duncit.com',
      password: 'StrongPass123',
      dob: new Date('1995-01-01'),
    });
    expect(value.first_name).toBe('Riya');
    expect(value.phone_number).toBeUndefined();
    expect(value.last_name).toBeUndefined();
  });

  it('registerSchema still requires first_name, email, password and dob', async () => {
    await expect(
      registerSchema.validate({ email: 'x@duncit.com', password: 'StrongPass123' })
    ).rejects.toThrow();
  });

  it('registerSchema rejects an invalid phone when one is supplied', async () => {
    await expect(
      registerSchema.validate({
        first_name: 'Riya',
        email: 'riya@duncit.com',
        password: 'StrongPass123',
        dob: new Date('1995-01-01'),
        phone_number: 'abc',
        phone_extension: '+91',
      })
    ).rejects.toThrow(/invalid phone/i);
  });

  it('googleSignupSchema accepts a token-only payload (no phone, no dob)', async () => {
    const value = await googleSignupSchema.validate({ id_token: 'a'.repeat(24) });
    expect(value.id_token).toHaveLength(24);
    expect(value.phone_number).toBeUndefined();
    expect(value.dob).toBeUndefined();
  });

  it('googleSignupSchema still requires the id_token', async () => {
    await expect(googleSignupSchema.validate({})).rejects.toThrow();
  });
});
