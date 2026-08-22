import { Types } from 'mongoose';
import { whatsappAuthService } from '../../auth-whatsapp.service';

const EXT = '+91';
const NUMBER = '9999999999';

/**
 * Proving a WhatsApp number end to end against the real challenge collection.
 *
 * The order matters and is deliberate: the code is checked BEFORE the user is
 * looked up, so a caller who never asked for a code cannot learn whether an
 * account exists by watching which error comes back. Collections are wiped
 * between tests, so each one starts with no live challenge.
 */
describe('whatsappAuthService integration', () => {
  it('hands the code back while no medium can actually deliver it', async () => {
    const res = await whatsappAuthService.requestOtp('91', NUMBER);

    expect(res.ok).toBe(true);
    expect(res.dev_otp).toBe('123456');
  });

  it('rejects a verify when no code was ever requested', async () => {
    await expect(
      whatsappAuthService.verifyOtp(new Types.ObjectId().toString(), EXT, NUMBER, '000000')
    ).rejects.toThrow(/expired/i);
  });

  it('rejects a wrong code against a live challenge', async () => {
    await whatsappAuthService.requestOtp('91', NUMBER);

    await expect(
      whatsappAuthService.verifyOtp(new Types.ObjectId().toString(), EXT, NUMBER, '000000')
    ).rejects.toThrow(/incorrect code/i);
  });

  it('throws when the code is right but the user is gone', async () => {
    const { dev_otp } = await whatsappAuthService.requestOtp('91', NUMBER);

    await expect(
      whatsappAuthService.verifyOtp(new Types.ObjectId().toString(), EXT, NUMBER, dev_otp as string)
    ).rejects.toThrow(/user not found/i);
  });

  it('throws when skipping for a non-existent user', async () => {
    await expect(whatsappAuthService.skip(new Types.ObjectId().toString())).rejects.toThrow(
      /user not found/i
    );
  });
});
