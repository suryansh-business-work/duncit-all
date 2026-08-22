import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { assertCaptcha } from './captcha.service';

/**
 * The gate every public write goes through.
 *
 * A signed-in caller is skipped on purpose. The account is already attached to
 * the row, the session already cost a login, and the same mutations are what
 * mWeb, the native app and the partner consoles post — asking a member who is
 * one tap into the app to read five letters off a picture buys nothing and
 * costs a form. The captcha is for the anonymous internet, which is exactly
 * where the spam comes from.
 */
export interface CaptchaCarrier {
  captcha_token?: string | null;
  captcha_answer?: string | null;
}

export function requireHuman(ctx: GraphQLContext, input: CaptchaCarrier): void {
  if (ctx.user) return;
  const token = (input.captcha_token ?? '').trim();
  if (!token) {
    throw new GraphQLError('Please complete the verification below.', {
      extensions: { code: 'CAPTCHA_REQUIRED' },
    });
  }
  assertCaptcha(token, input.captcha_answer ?? '');
}
