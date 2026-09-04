import { whatsappAuthService } from '../../auth-whatsapp.service';

/**
 * What this flow decides WITHOUT a database.
 *
 * Issuing and checking a code now goes through the shared `otpService`, which
 * stores its challenge in Mongo — so those paths moved to the integration
 * suite next door. What stays here is everything the service rejects before it
 * ever reaches the collection: the shape of the number it is asked for.
 */
describe('auth-whatsapp unit', () => {
  it('requestSignupOtp requires a country code', async () => {
    await expect(whatsappAuthService.requestSignupOtp('', '9999999999')).rejects.toThrow(
      /country code is required/i
    );
  });

  it('requestSignupOtp rejects an invalid number length', async () => {
    await expect(whatsappAuthService.requestSignupOtp('+91', '123')).rejects.toThrow(
      /valid phone number/i
    );
  });

});
