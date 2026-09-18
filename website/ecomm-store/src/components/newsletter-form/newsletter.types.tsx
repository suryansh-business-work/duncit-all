import { z } from 'zod';

import { emailRule, requiredRule } from '../../lib/validation';

type Translate = (key: string) => string;

/** Guests also answer the human check; a signed-in shopper never sees it. */
export const makeNewsletterSchema = (t: Translate, needsCaptcha: boolean) =>
  z.object({
    email: emailRule(t),
    captcha: needsCaptcha ? requiredRule(t, 'ecommStore.newsletter.captchaRequired', 12) : z.string(),
  });

export type NewsletterValues = z.infer<ReturnType<typeof makeNewsletterSchema>>;
