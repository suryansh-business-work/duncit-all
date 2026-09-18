import { z } from 'zod';
import { OTP_6 } from '@duncit/regex';

type Translate = (key: string) => string;

export const makeCodOtpSchema = (t: Translate) =>
  z.object({
    code: z
      .string()
      .trim()
      .refine((value) => OTP_6.test(value), t('ecommStore.validation.codeInvalid')),
  });

export type CodOtpValues = z.infer<ReturnType<typeof makeCodOtpSchema>>;
