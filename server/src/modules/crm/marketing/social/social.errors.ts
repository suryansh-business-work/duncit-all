import { SocialApiError } from './providers/http';

/**
 * A Meta refusal, in words a marketer can act on, and whether it means the
 * account must be reconnected. The provider's own text is kept for the logs,
 * never shown raw; nothing here carries a token.
 */
export interface MappedSendError {
  message: string;
  /** The token is dead or its permission was taken away: mark the account EXPIRED. */
  reconnect: boolean;
  /** Worth one more try later (rate limit, Meta-side blip). */
  retryable: boolean;
}

const OUTSIDE_WINDOW_SUBCODE = 2018278;
const USER_UNAVAILABLE = 551;
const INVALID_TOKEN = 190;
const PERMISSION_CODES = new Set([10, 200, 230]);
const RATE_LIMIT_CODES = new Set([4, 17, 32, 613]);
const TRANSIENT_CODES = new Set([1, 2]);

export function mapSendError(error: unknown): MappedSendError {
  if (!(error instanceof SocialApiError)) {
    return { message: 'The network could not be reached. Try again in a minute.', reconnect: false, retryable: true };
  }
  if (error.subcode === OUTSIDE_WINDOW_SUBCODE) {
    return { message: 'The messaging window has closed: this person last wrote more than 24 hours ago.', reconnect: false, retryable: false };
  }
  if (error.code === USER_UNAVAILABLE) {
    return { message: 'This person is not available on the network any more, or does not accept messages.', reconnect: false, retryable: false };
  }
  if (error.expired || error.code === INVALID_TOKEN) {
    return { message: 'The account’s connection has expired. Reconnect it in Social Accounts.', reconnect: true, retryable: false };
  }
  if (error.code !== null && PERMISSION_CODES.has(error.code)) {
    return { message: 'The connection does not have the messaging permission. Reconnect the account to grant it.', reconnect: true, retryable: false };
  }
  if (error.code !== null && RATE_LIMIT_CODES.has(error.code)) {
    return { message: 'The network is limiting how fast this account sends. Try again in a few minutes.', reconnect: false, retryable: true };
  }
  if (error.code !== null && TRANSIENT_CODES.has(error.code)) {
    return { message: 'The network had a temporary problem. Try again in a minute.', reconnect: false, retryable: true };
  }
  return { message: 'The network refused the message.', reconnect: false, retryable: false };
}
