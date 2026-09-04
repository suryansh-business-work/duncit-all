import { whatsappAuthService } from './auth-whatsapp.service';

interface OtpArgs {
  phone_extension: string;
  phone_number: string;
  email?: string | null;
  otp: string;
}

export const whatsappResolvers = {
  Mutation: {
    requestSignupWhatsAppOtp: (_p: unknown, args: Omit<OtpArgs, 'otp'>) =>
      whatsappAuthService.requestSignupOtp(args.phone_extension, args.phone_number, args.email),
    verifySignupWhatsAppOtp: (_p: unknown, args: Omit<OtpArgs, 'email'>) =>
      whatsappAuthService.verifySignupOtp(args.phone_extension, args.phone_number, args.otp),
  },
};
