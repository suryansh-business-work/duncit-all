import { z } from 'zod';
import { rules, type Translate } from '../../../lib/validation';

/** Which service proved the email: Lite's own code, or the person's Duncit account. */
export type LiteSignInVia = 'LITE' | 'DUNCIT';

/** Step one: the address the code goes to. */
export const makeEmailSchema = (t: Translate) => z.object({ email: rules.email(t) });

/** Step two: the code that arrived, and a name for a brand-new Lite account. */
export const makeCodeSchema = (t: Translate) => z.object({ code: rules.code(t), name: rules.optional(t, 80) });

export type EmailValues = z.infer<ReturnType<typeof makeEmailSchema>>;
export type CodeValues = z.infer<ReturnType<typeof makeCodeSchema>>;

/** What the API answered when the code was sent — the code step is built from it. */
export interface CodeSent {
  email: string;
  via: LiteSignInVia;
  minutes: number;
  resendAfter: number;
  testCode: string | null;
}

export interface SignInRequestResult {
  ok: boolean;
  via: LiteSignInVia;
  expires_in_minutes: number;
  resend_after_seconds: number;
  test_code: string | null;
}
