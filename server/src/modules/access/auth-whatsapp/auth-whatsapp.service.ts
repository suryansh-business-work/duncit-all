/**
 * Proving the WhatsApp number a new account signs up with.
 *
 * The code itself is issued and checked by the shared `otpService` — this file
 * only knows what a verified number MEANS here (it is written onto the user).
 * It used to hold its own compare-against-a-constant check; two OTP
 * implementations drift on expiry, attempt limits and single use, which is
 * exactly the duplication the shared service exists to remove.
 */
import { GraphQLError } from 'graphql';
import { UserModel } from '@modules/access/user/user.model';
import { userAuditService } from '@modules/access/userAudit/userAudit.service';
import { normalizePhone, otpService } from '@modules/platform/otp/otp.service';

/**
 * The account already holding this number, if it is not the caller's own.
 *
 * A number identifies an account at three doors (password login by phone,
 * Continue with OTP, and recovery), and `accountFor` matches it in EITHER
 * field — so one number on two accounts leaves those doors picking between
 * them. Checked at both moments a number can arrive: before a code is sent,
 * and again before it is written.
 */
async function numberHeldElsewhere(userId: string, extension: string, number: string) {
  return UserModel.findOne({
    _id: { $ne: userId },
    $or: [
      { 'auth.phone.number': number, 'auth.phone.extension': extension },
      { 'communication.whatsapp.number': number, 'communication.whatsapp.extension': extension },
    ],
  }).lean();
}

function numberTakenError(): GraphQLError {
  return new GraphQLError(
    'This phone number is already registered. Please use a different number or login.',
    { extensions: { code: 'CONFLICT' } }
  );
}

export const whatsappAuthService = {
  async requestOtp(extension: string, number: string, userId?: string) {
    /*
      Refused BEFORE anything is sent. The Google door types a number nobody
      has checked yet, so without this a person could send codes to a number
      that belongs to somebody else and only be told at the last step.

      Normalised first, because that is the shape the numbers are STORED in —
      comparing what was typed against what was saved would miss a match on
      spacing alone.
    */
    const target = normalizePhone(extension, number);
    if (userId && (await numberHeldElsewhere(userId, target.phone_extension, target.phone_number))) {
      throw numberTakenError();
    }
    const result = await otpService.request({
      purpose: 'WHATSAPP_SIGNUP',
      // The medium is an argument, not a second code path.
      mediums: ['WHATSAPP'],
      ...target,
      requested_by: userId ?? null,
    });
    return {
      ok: true,
      // Kept as `dev_otp` because the signup screens already read that field.
      dev_otp: result.test_code,
    };
  },

  /**
   * Prove the number, and write it where the signup said it belongs.
   *
   * `alsoMobile` is the signup tick box: it is the ONLY thing that writes
   * `auth.phone`, and it writes it verified — a code has just proved the
   * number, which is more than the signup form itself ever knew.
   */
  async verifyOtp(
    userId: string,
    extension: string,
    number: string,
    otp: string,
    alsoMobile = false
  ) {
    const { phone_extension, phone_number } = normalizePhone(extension, number);
    if (await numberHeldElsewhere(userId, phone_extension, phone_number)) {
      throw numberTakenError();
    }
    const challenge = await otpService.verifyLatest(
      'WHATSAPP_SIGNUP',
      { phone_extension, phone_number },
      otp
    );
    await otpService.consume(String(challenge._id), { purpose: 'WHATSAPP_SIGNUP' });
    // The before-image is read first: this write moves fields the admin user
    // change log tracks, and a diff needs both sides.
    const before = await UserModel.findById(userId).lean();
    let user;
    try {
      user = await UserModel.findByIdAndUpdate(
        userId,
        {
          $set: {
            'communication.whatsapp.extension': phone_extension,
            'communication.whatsapp.number': phone_number,
            'communication.whatsapp.verified_at': new Date(),
            ...(alsoMobile
              ? {
                  'auth.phone.extension': phone_extension,
                  'auth.phone.number': phone_number,
                  'auth.phone.is_verified': true,
                }
              : {}),
          },
        },
        { new: true }
      );
    } catch (e: any) {
      // The unique phone index is what actually decides, and it can refuse a
      // number the check above read as free — two people can be on this step
      // with the same number at once. Answered with the same sentence, so the
      // race and the ordinary case do not read differently.
      if (e?.code === 11000) throw numberTakenError();
      throw e;
    }
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
