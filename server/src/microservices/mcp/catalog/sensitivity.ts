import { wordsOf } from './naming';

/**
 * Whether a field or argument name holds a credential.
 *
 * Used twice: the catalog never SELECTS such a field into a tool's result (the
 * value would land in the AI's context and in its provider's logs), and the
 * usage log never STORES such an argument. Matching is on whole words, so
 * `pod_hashtag`, `seats_taken` and `pin_code` stay readable while
 * `access_token`, `dev_otp` and `client_secret` do not.
 */

const SENSITIVE_WORDS = new Set([
  'password',
  'passcode',
  'passphrase',
  'secret',
  'token',
  'tokens',
  'otp',
  'hash',
  'credential',
  'credentials',
  'cvv',
  'apikey',
  'privatekey',
]);

/** Pairs that are only sensitive together: `api_key`, `private_key`, `access_key`. */
const SENSITIVE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['api', 'key'],
  ['private', 'key'],
  ['access', 'key'],
  ['secret', 'key'],
  ['signing', 'key'],
  ['recovery', 'code'],
  ['recovery', 'codes'],
];

/**
 * "Token" is also how an AI bill is counted. Beside one of these words it is a
 * number — `prompt_tokens`, `token_count`, `token_price_input_per_million` —
 * never a credential, and hiding it would blank the usage figures themselves.
 */
const TOKEN_MEASURE_WORDS = new Set([
  'count',
  'total',
  'input',
  'output',
  'prompt',
  'completion',
  'price',
  'cost',
  'max',
  'min',
  'limit',
  'used',
  'usage',
  'per',
  'million',
  'estimate',
  'estimated',
]);

function isSensitiveWord(word: string, words: readonly string[]): boolean {
  if (!SENSITIVE_WORDS.has(word)) return false;
  if (word !== 'token' && word !== 'tokens') return true;
  return !words.some((other) => TOKEN_MEASURE_WORDS.has(other));
}

export function isSensitiveName(name: string): boolean {
  const words = wordsOf(name);
  if (words.some((word) => isSensitiveWord(word, words))) return true;
  return words.some((word, index) =>
    SENSITIVE_PAIRS.some(([first, second]) => word === first && words[index + 1] === second)
  );
}
