import {
  registerSchema,
  googleSignupSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from '../../user.validator';

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

  it('requestPasswordResetSchema requires a valid email', async () => {
    await expect(
      requestPasswordResetSchema.validate({ email: 'riya@duncit.com' }),
    ).resolves.toMatchObject({ email: 'riya@duncit.com' });
    await expect(requestPasswordResetSchema.validate({ email: 'nope' })).rejects.toThrow();
    await expect(requestPasswordResetSchema.validate({})).rejects.toThrow();
  });

  it('resetPasswordSchema requires email, a 6-digit OTP and an 8+ char password', async () => {
    await expect(
      resetPasswordSchema.validate({
        email: 'riya@duncit.com',
        otp: '123456',
        new_password: 'StrongPass123',
      }),
    ).resolves.toMatchObject({ otp: '123456' });

    await expect(
      resetPasswordSchema.validate({ email: 'riya@duncit.com', otp: '12', new_password: 'StrongPass123' }),
    ).rejects.toThrow(/6 digit/i);

    await expect(
      resetPasswordSchema.validate({ email: 'riya@duncit.com', otp: '123456', new_password: 'short' }),
    ).rejects.toThrow();
  });
});
