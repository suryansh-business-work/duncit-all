import { z } from 'zod';

import type { Translate } from './translate';

/**
 * How much a person must say when they ask an administrator for another way to
 * verify. The server's own limits (portalSecurity.constants), so the form
 * refuses exactly what the server would.
 */
export const SECURITY_EXCEPTION_REASON_MIN = 10;
export const SECURITY_EXCEPTION_REASON_MAX = 500;

/**
 * The console's Security Verification screen, "I cannot or will not share my
 * location": one box, read by the administrator who decides.
 */
export function makeSecurityExceptionSchema(t: Translate) {
  return z.object({
    reason: z
      .string()
      .trim()
      .min(
        SECURITY_EXCEPTION_REASON_MIN,
        t('shell.securityVerification.alternative.reasonTooShort', { vars: { min: String(SECURITY_EXCEPTION_REASON_MIN) } }),
      )
      .max(
        SECURITY_EXCEPTION_REASON_MAX,
        t('shell.securityVerification.alternative.reasonTooLong', { vars: { max: String(SECURITY_EXCEPTION_REASON_MAX) } }),
      ),
  });
}

export type SecurityExceptionValues = z.infer<ReturnType<typeof makeSecurityExceptionSchema>>;

export const securityExceptionDefaults: SecurityExceptionValues = { reason: '' };
