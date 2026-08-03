export interface EmailVerificationValues {
  otp: string;
}

export interface EmailVerificationFormProps {
  email?: string | null;
  verified?: boolean | null;
  onVerified: () => void;
  /** Arriving from the header nudge — mail the OTP straight away so the user
   * lands on a section that is already waiting for the code. */
  autoSend?: boolean;
}