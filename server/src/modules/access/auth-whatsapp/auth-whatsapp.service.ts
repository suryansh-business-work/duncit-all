import { GraphQLError } from 'graphql';
import { UserModel } from '@modules/access/user/user.model';

const DEV_OTP = process.env.WHATSAPP_DEV_OTP || '123456';
const isDev = (process.env.NODE_ENV || 'development') !== 'production';

function normalize(extension: string, number: string) {
  const ext = String(extension || '').trim().replace(/[^0-9+]/g, '');
  const num = String(number || '').trim().replace(/\D/g, '');
  if (!ext) throw new GraphQLError('Country code is required', { extensions: { code: 'BAD_USER_INPUT' } });
  if (num.length < 6 || num.length > 15) {
    throw new GraphQLError('Enter a valid WhatsApp number', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return { ext: ext.startsWith('+') ? ext : `+${ext}`, num };
}

export const whatsappAuthService = {
  async requestOtp(extension: string, number: string) {
    normalize(extension, number);
    // In dev/staging we simply echo a known OTP. In production this is where
    // a WhatsApp Business API send call would go.
    return {
      ok: true,
      dev_otp: isDev ? DEV_OTP : null,
    };
  },

  async verifyOtp(userId: string, extension: string, number: string, otp: string) {
    const { ext, num } = normalize(extension, number);
    const expected = DEV_OTP;
    if (String(otp).trim() !== expected) {
      throw new GraphQLError('Invalid OTP', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const user = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          'communication.whatsapp.extension': ext,
          'communication.whatsapp.number': num,
          'communication.whatsapp.verified_at': new Date(),
        },
      },
      { new: true }
    );
    if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return user;
  },

  async skip(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return user;
  },
};
