import {
  registerSchema,
  googleSignupSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  requestPasswordChangeSchema,
  changePasswordSchema,
} from '../../auth.validator';

/**
 * Both signup doors ask for the same thing, and the reason is the point of
 * these tests: an account is identified by its number as well as its email, so
 * neither door may create one for a number nobody has answered on. Which door
 * somebody came through cannot decide whether their number was verified.
 */
describe('auth validators — the signup contract', () => {
  /** A payload that satisfies the email door, minus whatever a case removes. */
  const registration = {
    first_name: 'Riya',
    email: 'riya@duncit.com',
    password: 'StrongPass123',
    dob: new Date('1995-01-01'),
    phone_number: '9876543210',
    phone_extension: '+91',
    whatsapp_token: 'wa-proof-token-value',
  };

  it('accepts a verified number and leaves last_name optional', async () => {
    const value = await registerSchema.validate(registration);
    expect(value.first_name).toBe('Riya');
    expect(value.phone_number).toBe('9876543210');
    expect(value.last_name).toBeUndefined();
    // The number is taken as the mobile number too unless the tick box says not.
    expect(value.whatsapp_is_mobile).toBe(true);
  });

  it('still requires first_name, email, password and dob', async () => {
    await expect(
      registerSchema.validate({ email: 'x@duncit.com', password: 'StrongPass123' })
    ).rejects.toThrow();
  });

  // The unique index on the number only means something if every account
  // created through this door actually carries one.
  it('refuses a registration with no phone at all', async () => {
    const { phone_number, ...withoutPhone } = registration;
    await expect(registerSchema.validate(withoutPhone)).rejects.toThrow();
  });

  it('refuses a registration whose number was never answered on', async () => {
    const { whatsapp_token, ...unproven } = registration;
    await expect(registerSchema.validate(unproven)).rejects.toThrow(/whatsapp_token/i);
  });

  it('rejects a phone number that is not one', async () => {
    await expect(
      registerSchema.validate({ ...registration, phone_number: 'abc' }),
    ).rejects.toThrow(/invalid phone/i);
  });

  // Google proves an email address and nothing else, so this door asks for the
  // same number and the same proof as the form does.
  it('makes the Google door ask for the number, its proof and a birthday', async () => {
    const value = await googleSignupSchema.validate({
      id_token: 'a'.repeat(24),
      phone_number: '9876543210',
      phone_extension: '+91',
      whatsapp_token: 'wa-proof-token-value',
      dob: '2000-04-11',
    });
    expect(value.id_token).toHaveLength(24);
    expect(value.phone_number).toBe('9876543210');
    // A Date, not the exact instant: yup parses a bare date in the RUNNER's
    // zone, so pinning the timestamp would pass in UTC and fail in IST.
    expect(value.dob).toBeInstanceOf(Date);
    expect((value.dob as Date).getFullYear()).toBe(2000);
  });

  /*
    Google proves an email address and nothing else — not a number, and not a
    birthday. The minimum-age gate needs one, and which door somebody came
    through cannot decide whether the platform knows how old they are.
  */
  it('refuses a Google signup with no date of birth', async () => {
    await expect(
      googleSignupSchema.validate({
        id_token: 'a'.repeat(24),
        phone_number: '9876543210',
        phone_extension: '+91',
        whatsapp_token: 'wa-proof-token-value',
      })
    ).rejects.toThrow(/dob/i);
  });

  it('refuses a Google signup carrying only the id_token', async () => {
    await expect(googleSignupSchema.validate({ id_token: 'a'.repeat(24) })).rejects.toThrow();
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

  /*
    The current password is optional on purpose, and only here. A Google-signup
    account has none to prove and this flow CREATES its first, so a required
    rule would lock those accounts out of ever setting one. What is NOT optional
    is the check itself: `requestPasswordChangeOtp` compares against the stored
    hash whenever one exists, so an account WITH a password still cannot skip it
    by omitting the field.
  */
  it('requestPasswordChangeSchema takes an 8+ char current_password, or none at all', async () => {
    await expect(
      requestPasswordChangeSchema.validate({ current_password: 'StrongPass123' }),
    ).resolves.toMatchObject({ current_password: 'StrongPass123' });
    await expect(requestPasswordChangeSchema.validate({ current_password: 'short' })).rejects.toThrow();
    await expect(requestPasswordChangeSchema.validate({})).resolves.toBeTruthy();
  });

  it('changePasswordSchema requires a 6-digit OTP and an 8+ char new_password', async () => {
    await expect(
      changePasswordSchema.validate({ otp: '123456', new_password: 'BrandNew123' }),
    ).resolves.toMatchObject({ otp: '123456' });
    await expect(
      changePasswordSchema.validate({ otp: '12', new_password: 'BrandNew123' }),
    ).rejects.toThrow(/6 digit/i);
    await expect(
      changePasswordSchema.validate({ otp: '123456', new_password: 'short' }),
    ).rejects.toThrow();
  });

});
