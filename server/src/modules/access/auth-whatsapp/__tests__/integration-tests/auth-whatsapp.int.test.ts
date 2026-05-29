import { Types } from 'mongoose';
import { whatsappAuthService } from '../../auth-whatsapp.service';

describe('whatsappAuthService integration', () => {
  it('throws when verifying for a non-existent user', async () => {
    await expect(
      whatsappAuthService.verifyOtp(new Types.ObjectId().toString(), '+91', '9999999999', '123456')
    ).rejects.toThrow(/user not found/i);
  });

  it('throws when skipping for a non-existent user', async () => {
    await expect(
      whatsappAuthService.skip(new Types.ObjectId().toString())
    ).rejects.toThrow(/user not found/i);
  });
});
