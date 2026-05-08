import { whatsappAuthService } from './auth-whatsapp.service';
import { userService } from '../user/user.service';
import { requireAuth } from '../../middleware/rbac';
import type { GraphQLContext } from '../../context';

export const whatsappResolvers = {
  Mutation: {
    requestWhatsAppOtp: async (
      _p: unknown,
      args: { phone_extension: string; phone_number: string },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);
      return whatsappAuthService.requestOtp(args.phone_extension, args.phone_number);
    },
    verifyWhatsAppOtp: async (
      _p: unknown,
      args: { phone_extension: string; phone_number: string; otp: string },
      ctx: GraphQLContext
    ) => {
      const auth = requireAuth(ctx);
      await whatsappAuthService.verifyOtp(
        auth.id,
        args.phone_extension,
        args.phone_number,
        args.otp
      );
      return userService.me(auth.id);
    },
    skipWhatsAppOtp: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const auth = requireAuth(ctx);
      return userService.me(auth.id);
    },
  },
};
