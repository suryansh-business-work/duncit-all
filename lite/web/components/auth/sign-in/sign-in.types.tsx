import { z } from 'zod';
import type { LiteSignInVia } from '../../../../shared/graphql/documents';
import { rules, type Translate } from '../../../lib/validation';

export type { LiteSignInVia };

/** Where the code goes: an inbox, or a phone by SMS. */
export type SignInChannel = 'EMAIL' | 'PHONE';

/** Step one: the email or phone the code goes to. A phone may be typed without its country code. */
export const makeContactSchema = (t: Translate, channel: SignInChannel) => z.object({ value: channel === 'EMAIL' ? rules.email(t) : rules.phone(t) });

/** Step two: the code that arrived, and a name for a brand-new Lite account. */
export const makeCodeSchema = (t: Translate) => z.object({ code: rules.code(t), name: rules.optional(t, 80) });

export type ContactValues = z.infer<ReturnType<typeof makeContactSchema>>;
export type CodeValues = z.infer<ReturnType<typeof makeCodeSchema>>;

/** What the API answered when the code was sent — the code step is built from it. */
export interface CodeSent {
  channel: SignInChannel;
  /** The email or phone exactly as the reader typed it (the API normalises it the same way each time). */
  contact: string;
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
