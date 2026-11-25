import { z } from 'zod';

import type { Translate } from './translate';

/**
 * Console sign-in — every Duncit portal's login card and the Duncit CRM app:
 * an e-mail address and a password, nothing more. Not `makeLoginSchema`: that
 * is the member contract (phone channel, 8-character password floor, `mweb.*`
 * copy), which would refuse a console password the server accepts.
 */
export interface ConsoleLoginValues {
  email: string;
  password: string;
}

export const consoleLoginDefaults: ConsoleLoginValues = { email: '', password: '' };

export const makeConsoleLoginSchema = (t: Translate) =>
  z.object({
    email: z
      .string()
      .trim()
      .min(1, t('session.login.emailRequired'))
      // The HTML5 pattern rather than Zod's stricter default: the one the console
      // login has always checked against, so no address it accepted is now refused.
      .email({ pattern: z.regexes.html5Email, error: t('session.login.emailInvalid') }),
    password: z.string().min(1, t('session.login.passwordRequired')),
  });
