import { z } from 'zod';
import type { Translate } from '@duncit/forms/schemas';

export interface EmailStepValues {
  email: string;
}

export interface CodeStepValues {
  code: string;
}

/** What `liteRequestSignInCode` answers. */
export interface SignInRequest {
  ok: boolean;
  via: 'LITE' | 'DUNCIT';
  expires_in_minutes: number;
  resend_after_seconds: number;
  test_code: string | null;
}

const SIX_DIGITS = /^\d{6}$/;

export const makeEmailSchema = (t: Translate) =>
  z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, t('litePortal.validation.required', { vars: { field: t('lite.auth.email') } }))
      .email(t('litePortal.validation.email')),
  });

export const makeCodeSchema = (t: Translate) =>
  z.object({
    code: z.string().trim().regex(SIX_DIGITS, t('litePortal.validation.code')),
  });
