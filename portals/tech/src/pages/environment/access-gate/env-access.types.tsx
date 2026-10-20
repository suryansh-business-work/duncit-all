import { z } from 'zod';
import { OTP_6, toDigits } from '@duncit/regex';

/** The code field: exactly the six digits the root admin was emailed. */
export const envAccessSchema = (invalid: string) =>
  z.object({
    code: z.string().trim().regex(OTP_6, invalid),
  });

export type EnvAccessValues = z.infer<ReturnType<typeof envAccessSchema>>;

/** A pasted "123 456" or "Code: 123456" still lands as the six digits. */
export const cleanCode = (value: string) => toDigits(value).slice(0, 6);

/** The code request in flight: which challenge to verify against, and when to allow a resend. */
export interface PendingCode {
  challengeId: string;
  expiresAt: string;
  sentTo: string;
  resendAt: number;
}
