import { whatsappAuthService } from '../../auth-whatsapp.service';
import { whatsappResolvers } from '../../auth-whatsapp.resolver';
import { makeContext } from '@test/harness';

/**
 * What this flow decides WITHOUT a database.
 *
 * Issuing and checking a code now goes through the shared `otpService`, which
 * stores its challenge in Mongo — so those paths moved to the integration
 * suite next door. What stays here is everything the service rejects before it
 * ever reaches the collection: the shape of the number, and who is allowed to
 * ask.
 */
describe('auth-whatsapp unit', () => {
  it('requestOtp requires a country code', async () => {
    await expect(whatsappAuthService.requestOtp('', '9999999999')).rejects.toThrow(
      /country code is required/i
    );
  });

  it('requestOtp rejects an invalid number length', async () => {
    await expect(whatsappAuthService.requestOtp('+91', '123')).rejects.toThrow(
      /valid phone number/i
    );
  });

  it('requestWhatsAppOtp requires authentication', async () => {
    await expect(
      (whatsappResolvers.Mutation as any).requestWhatsAppOtp(
        {},
        { phone_extension: '+91', phone_number: '9999999999' },
        makeContext(null)
      )
    ).rejects.toThrow(/authenticat/i);
  });
});
