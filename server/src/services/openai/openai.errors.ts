import { GraphQLError } from 'graphql';
import type { OpenAiChatResult } from './openai.client';

/**
 * The failure half of {@link openaiChat}, as the GraphQL errors the AI
 * mutations have always raised.
 *
 * The codes are load-bearing: the admin clients branch on `AI_NOT_CONFIGURED`
 * to point the user at the Tech portal rather than showing a stack of upstream
 * detail, so they must survive the move onto the shared client.
 */
type Failure = Extract<OpenAiChatResult, { ok: false }>;

const CODES: Record<Failure['code'], string> = {
  NOT_CONFIGURED: 'AI_NOT_CONFIGURED',
  NETWORK: 'AI_NETWORK_ERROR',
  UPSTREAM: 'AI_UPSTREAM_ERROR',
  EMPTY: 'AI_EMPTY_RESPONSE',
};

function messageFor(res: Failure): string {
  if (res.code === 'NOT_CONFIGURED') return 'OPENAI_API_KEY is not configured on the server';
  if (res.code === 'NETWORK') return `Failed to reach OpenAI: ${res.message}`;
  if (res.code === 'EMPTY') return 'OpenAI returned an empty response';
  return `OpenAI error (${res.status}): ${res.message}`;
}

export const openAiGraphQLError = (res: Failure): GraphQLError =>
  new GraphQLError(messageFor(res), { extensions: { code: CODES[res.code] } });

/** The model answered, but not with the JSON the caller asked for. */
export const openAiInvalidJsonError = (): GraphQLError =>
  new GraphQLError('OpenAI did not return valid JSON', { extensions: { code: 'AI_INVALID_JSON' } });
