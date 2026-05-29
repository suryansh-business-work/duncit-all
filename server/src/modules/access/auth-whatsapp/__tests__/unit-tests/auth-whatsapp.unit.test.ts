import { Types } from 'mongoose';
import { whatsappAuthService } from '../../auth-whatsapp.service';
import { whatsappResolvers } from '../../auth-whatsapp.resolver';
import { makeContext } from '@test/harness';

describe('auth-whatsapp unit', () => {
  it('requestOtp requires a country code', async () => {
    await expect(whatsappAuthService.requestOtp('', '9999999999')).rejects.toThrow(/country code is required/i);
  });

  it('requestOtp rejects an invalid number length', async () => {
    await expect(whatsappAuthService.requestOtp('+91', '123')).rejects.toThrow(/valid whatsapp number/i);
  });

  it('requestOtp returns a dev OTP in non-production', async () => {
    const res = await whatsappAuthService.requestOtp('91', '9999999999');
    expect(res.ok).toBe(true);
    expect(res.dev_otp).toBe('123456');
  });

  it('verifyOtp rejects a wrong code before touching the DB', async () => {
    await expect(
      whatsappAuthService.verifyOtp(new Types.ObjectId().toString(), '+91', '9999999999', '000000')
    ).rejects.toThrow(/invalid otp/i);
  });

  it('requestWhatsAppOtp requires authentication', async () => {
    await expect(
      (whatsappResolvers.Mutation as any).requestWhatsAppOtp({}, { phone_extension: '+91', phone_number: '9999999999' }, makeContext(null))
    ).rejects.toThrow(/authenticat/i);
  });
});
