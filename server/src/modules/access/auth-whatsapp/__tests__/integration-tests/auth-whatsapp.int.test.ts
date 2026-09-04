import { whatsappAuthService } from '../../auth-whatsapp.service';

const EXT = '+91';
const NUMBER = '9999999999';

/**
 * Proving a WhatsApp number end to end against the real challenge collection.
 *
 * There is no account behind any of this: the proof comes BEFORE signup creates
 * one, which is what makes the step unskippable. Collections are wiped between
 * tests, so each one starts with no live challenge.
 */
describe('whatsappAuthService integration', () => {
  it('hands the code back while no medium can actually deliver it', async () => {
    const res = await whatsappAuthService.requestSignupOtp('91', NUMBER);

    expect(res.ok).toBe(true);
    expect(res.dev_otp).toBe('123456');
  });

  it('rejects a verify when no code was ever requested', async () => {
    await expect(
      whatsappAuthService.verifySignupOtp(EXT, NUMBER, '000000')
    ).rejects.toThrow(/expired/i);
  });

  it('rejects a wrong code against a live challenge', async () => {
    await whatsappAuthService.requestSignupOtp('91', NUMBER);

    await expect(
      whatsappAuthService.verifySignupOtp(EXT, NUMBER, '000000')
    ).rejects.toThrow(/incorrect code/i);
  });

  it('trades a right code for a one-shot proof', async () => {
    const { dev_otp } = await whatsappAuthService.requestSignupOtp('91', NUMBER);

    const proved = await whatsappAuthService.verifySignupOtp(EXT, NUMBER, dev_otp as string);

    expect(proved.ok).toBe(true);
    expect(proved.whatsapp_token).toContain('.');
  });

  it('refuses a proof redeemed against a different number', async () => {
    const { dev_otp } = await whatsappAuthService.requestSignupOtp('91', NUMBER);
    const { whatsapp_token } = await whatsappAuthService.verifySignupOtp(
      EXT,
      NUMBER,
      dev_otp as string
    );

    await expect(
      whatsappAuthService.redeemSignupProof(whatsapp_token, EXT, '9888877777')
    ).rejects.toThrow(/different number/i);
  });

  it('spends a proof once', async () => {
    const { dev_otp } = await whatsappAuthService.requestSignupOtp('91', NUMBER);
    const { whatsapp_token } = await whatsappAuthService.verifySignupOtp(
      EXT,
      NUMBER,
      dev_otp as string
    );

    const challenge = await whatsappAuthService.redeemSignupProof(whatsapp_token, EXT, NUMBER);
    await whatsappAuthService.spendSignupProof(challenge);

    await expect(
      whatsappAuthService.redeemSignupProof(whatsapp_token, EXT, NUMBER)
    ).rejects.toThrow(/expired|start again/i);
  });
});
