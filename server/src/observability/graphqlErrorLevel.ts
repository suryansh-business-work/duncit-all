/**
 * Which GraphQL failures are the platform's problem, and which are just an
 * answer.
 *
 * Every error leaving a resolver used to be logged at ERROR, so the Tech
 * portal's error feed filled with rows nothing is wrong with: a signed-out tab
 * asking a gated query, someone opening a portal their roles do not carry, a
 * buyer who has not saved a billing address yet. Those are the API refusing
 * correctly. Logged beside a real fault they hide it, and — because an ERROR
 * row also rolls up into a Bug (telemetry.service) — they open bugs for
 * behaviour that is working as designed.
 *
 * So the level is chosen by who has to act: the CALLER (warn) or US (error).
 * Nothing is dropped either way; `persisted_levels` keeps both, and the Error
 * Logs section filters on the component marker rather than the level, so a
 * warn row is still there when someone goes looking for it.
 */

/**
 * Codes that mean "the request was answered, and the answer was no". Kept as
 * the codes the server actually throws rather than a prefix/heuristic, so a
 * new code is loud (error) until someone decides it is routine.
 */
const CALLER_FIXABLE_CODES = new Set([
  // The caller is not signed in, or not signed in as someone who may do this.
  'UNAUTHENTICATED',
  'FORBIDDEN',
  // The caller sent something the schema or a validator refused.
  'BAD_USER_INPUT',
  'GRAPHQL_VALIDATION_FAILED',
  'GRAPHQL_PARSE_FAILED',
  'BAD_REQUEST',
  // The caller's account is not ready for this act yet.
  'CHECKOUT_NOT_ELIGIBLE',
  'VERIFICATION_UNDER_REVIEW',
  // The thing asked for is gone, or someone else got there first.
  'NOT_FOUND',
  'CONFLICT',
]);

/**
 * The log level for one GraphQL error code.
 *
 * Everything not named above — INTERNAL_SERVER_ERROR, BAD_GATEWAY,
 * CONFIG_ERROR, an unrecognised code — stays ERROR, because those are the ones
 * a person is supposed to be woken up by.
 */
export function graphqlErrorLevel(code: string): 'warn' | 'error' {
  return CALLER_FIXABLE_CODES.has(code) ? 'warn' : 'error';
}
