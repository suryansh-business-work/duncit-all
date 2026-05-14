export interface EmailVerificationValues {
  otp: string;
}

export interface EmailVerificationFormProps {
  email?: string | null;
  verified?: boolean | null;
  onVerified: () => void;
}