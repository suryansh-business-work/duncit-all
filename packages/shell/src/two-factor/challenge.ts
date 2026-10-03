import { firstGraphQLError } from '@duncit/utils';

/** The refusal a console sign-in answers with when the account has an authenticator app on. */
export const TWO_FACTOR_REQUIRED = 'TWO_FACTOR_REQUIRED';
/** The second step was not finished in time — the person signs in again. */
export const TWO_FACTOR_CHALLENGE_EXPIRED = 'TWO_FACTOR_CHALLENGE_EXPIRED';

/** What the refusal carries: the token to trade back with the code. */
export interface TwoFactorChallenge {
  token: string;
}

/** The challenge a failed sign-in carries, or null when it failed for any other reason. */
export function twoFactorChallengeOf(error: unknown): TwoFactorChallenge | null {
  const extensions = firstGraphQLError(error)?.extensions;
  if (extensions?.code !== TWO_FACTOR_REQUIRED) return null;
  const token = extensions.challenge_token;
  return typeof token === 'string' && token ? { token } : null;
}

/** Whether a failed second step means "start again" rather than "try another code". */
export const isChallengeExpired = (error: unknown): boolean =>
  firstGraphQLError(error)?.extensions?.code === TWO_FACTOR_CHALLENGE_EXPIRED;
