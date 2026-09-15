import type { GraphQLContext } from '@context';
import { whatsappAuthService, type SignupContactInput } from './auth-whatsapp.service';

interface OtpArgs {
  phone_extension: string;
  phone_number: string;
  email?: string | null;
  otp: string;
}

export const whatsappResolvers = {
  Query: {
    // A signed-in caller is asking from the profile's contact change: their own
    // account is never "another account".
    signupContactAvailability: (_p: unknown, args: SignupContactInput, ctx: GraphQLContext) =>
      whatsappAuthService.contactAvailability(args, ctx.user?.id),
  },
  Mutation: {
    requestSignupWhatsAppOtp: (_p: unknown, args: Omit<OtpArgs, 'otp'>) =>
      whatsappAuthService.requestSignupOtp(args.phone_extension, args.phone_number, args.email),
    verifySignupWhatsAppOtp: (_p: unknown, args: Omit<OtpArgs, 'email'>) =>
      whatsappAuthService.verifySignupOtp(args.phone_extension, args.phone_number, args.otp),
  },
};
