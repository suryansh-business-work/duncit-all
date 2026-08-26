import { requireAuth } from '@middleware/rbac';
import { userService } from '@modules/access/user/user.service';
import type { GraphQLContext } from '@context';
import { contactChangeService, type ContactPhoneField } from './contactChange.service';

interface PhoneArgs {
  field: ContactPhoneField;
  phone_extension: string;
  phone_number: string;
}

/**
 * Every mutation here authorises itself from the session and acts on that
 * account and no other. There is no `user_id` argument anywhere in this file
 * on purpose: an argument would be a way to send a one-time code to somebody
 * else's number, and to move somebody else's address once it came back.
 *
 * An admin changing another person's contact details uses `updateUser`, which
 * is gated on an admin role instead and needs no code.
 */
export const contactChangeResolvers = {
  Mutation: {
    requestContactPhoneChangeOtp: async (
      _p: unknown,
      args: PhoneArgs,
      ctx: GraphQLContext
    ) => {
      const auth = requireAuth(ctx);
      return contactChangeService.requestPhoneOtp(
        auth.id,
        args.field,
        args.phone_extension,
        args.phone_number
      );
    },

    confirmContactPhoneChange: async (
      _p: unknown,
      args: PhoneArgs & { otp: string },
      ctx: GraphQLContext
    ) => {
      const auth = requireAuth(ctx);
      await contactChangeService.confirmPhoneChange(
        auth.id,
        args.field,
        args.phone_extension,
        args.phone_number,
        args.otp
      );
      // Answered through `publishMe` so the caller gets the same public User
      // shape every other profile mutation hands back — and so the account's
      // OTHER open surfaces learn the number moved rather than showing the old
      // one until they are reloaded.
      return userService.publishMe(auth.id);
    },

    requestEmailChangeOtp: async (
      _p: unknown,
      args: { email: string },
      ctx: GraphQLContext
    ) => {
      const auth = requireAuth(ctx);
      return contactChangeService.requestEmailOtp(auth.id, args.email);
    },

    confirmEmailChange: async (
      _p: unknown,
      args: { email: string; otp: string },
      ctx: GraphQLContext
    ) => {
      const auth = requireAuth(ctx);
      await contactChangeService.confirmEmailChange(auth.id, args.email, args.otp);
      return userService.publishMe(auth.id);
    },
  },
};
