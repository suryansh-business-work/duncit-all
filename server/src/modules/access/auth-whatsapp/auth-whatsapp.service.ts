import { GraphQLError } from 'graphql';
import { UserModel } from '@modules/access/user/user.model';
import { userAuditService } from '@modules/access/userAudit/userAudit.service';
import { normalizePhone, otpService } from '@modules/platform/otp/otp.service';

/**
 * Proving the WhatsApp number a new account signs up with.
 *
 * The code itself is issued and checked by the shared `otpService` — this file
 * only knows what a verified number MEANS here (it is written onto the user).
 * It used to hold its own compare-against-a-constant check; two OTP
 * implementations drift on expiry, attempt limits and single use, which is
 * exactly the duplication the shared service exists to remove.
 */
export const whatsappAuthService = {
  async requestOtp(extension: string, number: string, userId?: string) {
    const result = await otpService.request({
      purpose: 'WHATSAPP_SIGNUP',
      // The medium is an argument, not a second code path.
      mediums: ['WHATSAPP'],
      phone_extension: extension,
      phone_number: number,
      requested_by: userId ?? null,
    });
    return {
      ok: true,
      // Kept as `dev_otp` because the signup screens already read that field.
      dev_otp: result.test_code,
    };
  },

  async verifyOtp(userId: string, extension: string, number: string, otp: string) {
    const { phone_extension, phone_number } = normalizePhone(extension, number);
    const challenge = await otpService.verifyLatest(
      'WHATSAPP_SIGNUP',
      { phone_extension, phone_number },
      otp
    );
    await otpService.consume(String(challenge._id), { purpose: 'WHATSAPP_SIGNUP' });
    // The before-image is read first: this write moves three fields the admin
    // user change log tracks, and a diff needs both sides.
    const before = await UserModel.findById(userId).lean();
    const user = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          'communication.whatsapp.extension': phone_extension,
          'communication.whatsapp.number': phone_number,
          'communication.whatsapp.verified_at': new Date(),
        },
      },
      { new: true }
    );
    if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    await userAuditService.record({ userId, before, after: user });
    return user;
  },

  async skip(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return user;
  },
};
