import type { CaptchaChallenge, CaptchaErrorCode, GraphqlErrorLike } from './types';

/**
 * Fetching a challenge, without a GraphQL client.
 *
 * The surfaces that need this most are the ones with the least: a static Astro
 * page has no Apollo, no store and no session. One POST is the whole of it.
 */

export const CAPTCHA_CHALLENGE_SDL =
  'query CaptchaChallenge { captchaChallenge { token image expires_in } }';

interface CaptchaResponse {
  data?: { captchaChallenge?: CaptchaChallenge | null } | null;
  errors?: GraphqlErrorLike[];
}

/**
 * One fresh challenge, or null when the API cannot be reached.
 *
 * Null rather than a throw: every caller is a form that has to decide what to
 * show, and none of them can do anything useful with an exception.
 */
export async function requestCaptchaChallenge(
  graphqlUrl: string,
  signal?: AbortSignal
): Promise<CaptchaChallenge | null> {
  try {
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: CAPTCHA_CHALLENGE_SDL }),
      signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as CaptchaResponse;
    const challenge = json.data?.captchaChallenge;
    return challenge?.token ? challenge : null;
  } catch {
    return null;
  }
}

/** Server code -> the copy key that explains it. Hoisted, so `.has()` is cheap. */
const CODE_BY_EXTENSION = new Map<string, CaptchaErrorCode>([
  ['CAPTCHA_REQUIRED', 'required'],
  ['CAPTCHA_INVALID', 'expired'],
  ['CAPTCHA_EXPIRED', 'expired'],
  ['CAPTCHA_WRONG', 'wrong'],
]);

/**
 * Which captcha failure a response carries, or null when it failed for some
 * other reason entirely — in which case the form shows its own message.
 */
export function captchaErrorCode(
  errors: readonly GraphqlErrorLike[] | null | undefined
): CaptchaErrorCode | null {
  for (const error of errors ?? []) {
    const code = error?.extensions?.code;
    const mapped = typeof code === 'string' ? CODE_BY_EXTENSION.get(code) : undefined;
    if (mapped) return mapped;
  }
  return null;
}
