import { isSensitiveName } from '../../catalog/sensitivity';

/**
 * isSensitiveName decides two things: a field the catalog never selects into a
 * result, and an argument the activity log never stores. Matching is on whole
 * words, so ordinary pod fields stay readable.
 */
describe('isSensitiveName — credentials are caught', () => {
  it.each([
    'access_token',
    'refreshToken',
    'push_tokens',
    'dev_otp',
    'client_secret',
    'password',
    'newPassword',
    'passcode',
    'passphrase',
    'password_hash',
    'card_cvv',
    'apikey',
    'privatekey',
    'credentials',
    'aws_credential',
  ])('%s is sensitive (a sensitive word on its own)', (name) => {
    expect(isSensitiveName(name)).toBe(true);
  });

  it.each(['api_key', 'apiKey', 'google_maps_api_key', 'private_key', 'asc_private_key', 'access_key', 'secret_key', 'signing_key', 'recovery_code', 'recovery_codes'])(
    '%s is sensitive (a sensitive pair of words in order)',
    (name) => {
      expect(isSensitiveName(name)).toBe(true);
    }
  );
});

describe('isSensitiveName — ordinary fields stay readable', () => {
  it.each(['pod_hashtag', 'seats_taken', 'pin_code', 'pod_title', 'hashtags', 'tokenizer_name', 'otpless_signup', 'secretary', 'keyboard_layout'])(
    '%s is not sensitive (the word only appears inside another word)',
    (name) => {
      expect(isSensitiveName(name)).toBe(false);
    }
  );

  it('needs both words of a pair, in order and adjacent', () => {
    expect(isSensitiveName('key_api')).toBe(false);
    expect(isSensitiveName('api_version')).toBe(false);
    expect(isSensitiveName('primary_key')).toBe(false);
    expect(isSensitiveName('api_public_key')).toBe(false);
    expect(isSensitiveName('recovery_email')).toBe(false);
  });

  it('is not fooled by an empty or punctuation-only name', () => {
    expect(isSensitiveName('')).toBe(false);
    expect(isSensitiveName('__')).toBe(false);
  });

  // A count of LLM tokens (or their price) is a number, never a credential —
  // hiding it strips the MCP console's own usage tools and the OpenAI usage
  // console of their main figures.
  it.each(['token_count', 'prompt_tokens', 'completion_tokens', 'total_tokens', 'input_tokens', 'output_tokens', 'token_price_input_per_million'])(
    '%s is a measure of LLM tokens, not a credential',
    (name) => {
      expect(isSensitiveName(name)).toBe(false);
    }
  );
});

describe('isSensitiveName — "token" as a unit of AI usage', () => {
  it.each(['max_tokens', 'minTokens', 'usage_tokens', 'tokens_used', 'token_limit', 'token_cost', 'tokens_per_million', 'estimated_tokens', 'token_estimate'])(
    '%s counts tokens beside a measure word, so it stays readable',
    (name) => {
      expect(isSensitiveName(name)).toBe(false);
    }
  );

  it.each(['token', 'tokens', 'push_tokens', 'access_token', 'refreshToken', 'fcm_token', 'reset_token', 'api_token'])(
    '%s has no measure word, so it is still a credential',
    (name) => {
      expect(isSensitiveName(name)).toBe(true);
    }
  );

  it('lets a measure word excuse "token" only — every other sensitive word still counts', () => {
    expect(isSensitiveName('max_password')).toBe(true);
    expect(isSensitiveName('password_min_length')).toBe(true);
    expect(isSensitiveName('otp_count')).toBe(true);
    expect(isSensitiveName('secret_usage')).toBe(true);
    expect(isSensitiveName('hash_total')).toBe(true);
  });

  it('still catches a credential pair beside a measure word', () => {
    expect(isSensitiveName('usage_api_key')).toBe(true);
    expect(isSensitiveName('max_private_key')).toBe(true);
  });

  it('still catches another credential word in a name that also counts tokens', () => {
    expect(isSensitiveName('token_count_secret')).toBe(true);
    expect(isSensitiveName('max_tokens_password')).toBe(true);
  });
});
