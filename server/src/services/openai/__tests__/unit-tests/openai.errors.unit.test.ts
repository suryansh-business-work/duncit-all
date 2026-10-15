/**
 * The failure half of `openaiChat`, as the GraphQL errors the AI mutations
 * raise. The codes are load-bearing — the consoles branch on them — so each
 * failure has its own, and a switched-off feature is told apart from a missing
 * key: one is fixed in the AI portal, the other in the Tech portal.
 */
import type { OpenAiChatResult } from '../../openai.client';
import { openAiGraphQLError, openAiInvalidJsonError } from '../../openai.errors';

type Failure = Extract<OpenAiChatResult, { ok: false }>;

const failure = (code: Failure['code'], over: Partial<Failure> = {}): Failure => ({
  ok: false,
  code,
  status: 0,
  message: 'detail',
  model: 'gpt-4o-mini',
  ...over,
});

describe('openAiGraphQLError', () => {
  it('maps a switched-off feature to AI_FEATURE_DISABLED and names the AI portal', () => {
    const error = openAiGraphQLError(failure('DISABLED'));

    expect(error.extensions.code).toBe('AI_FEATURE_DISABLED');
    expect(error.message).toBe('This AI feature is switched off in the AI portal');
  });

  it('keeps a missing key as AI_NOT_CONFIGURED, distinct from a switched-off feature', () => {
    const error = openAiGraphQLError(failure('NOT_CONFIGURED'));

    expect(error.extensions.code).toBe('AI_NOT_CONFIGURED');
    expect(error.message).toContain('OPENAI_API_KEY');
  });

  it('carries the transport reason on a network failure', () => {
    const error = openAiGraphQLError(failure('NETWORK', { message: 'ENOTFOUND' }));

    expect(error.extensions.code).toBe('AI_NETWORK_ERROR');
    expect(error.message).toBe('Failed to reach OpenAI: ENOTFOUND');
  });

  it('reports an empty answer as AI_EMPTY_RESPONSE', () => {
    const error = openAiGraphQLError(failure('EMPTY', { status: 200 }));

    expect(error.extensions.code).toBe('AI_EMPTY_RESPONSE');
    expect(error.message).toBe('OpenAI returned an empty response');
  });

  it('carries the upstream status and message', () => {
    const error = openAiGraphQLError(failure('UPSTREAM', { status: 429, message: 'Rate limit' }));

    expect(error.extensions.code).toBe('AI_UPSTREAM_ERROR');
    expect(error.message).toBe('OpenAI error (429): Rate limit');
  });
});

describe('openAiInvalidJsonError', () => {
  it('is AI_INVALID_JSON', () => {
    expect(openAiInvalidJsonError().extensions.code).toBe('AI_INVALID_JSON');
  });
});
