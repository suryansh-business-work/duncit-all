/**
 * One parser for every server-operation failure.
 *
 * Every surface talks to the same GraphQL server, and every surface was
 * reading its failures its own way — a portal toast, an mWeb alert and a
 * native Text each doing their own digging through ApolloError. This is the
 * one place that digs. It is structurally typed rather than importing
 * ApolloError so the native app (which speaks raw fetch) parses the same
 * shapes without dragging Apollo into its bundle.
 */

/** What went wrong, at the level a screen decides behaviour on. */
export type IssueKind =
  | 'NETWORK'
  | 'AUTH'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'SERVER'
  | 'UNKNOWN';

export interface ParsedIssue {
  kind: IssueKind;
  /** The server's extensions.code, verbatim — `CHECKOUT_NOT_ELIGIBLE`, `CONFLICT`… */
  code: string | null;
  /** The human message to show. Server-written when there is one. */
  message: string;
  /** GraphQL operation name when the caller supplied it. */
  operation: string | null;
  /** The failing field path the server reported, dot-joined. */
  path: string | null;
  /**
   * Whether a "Report issue" control belongs beside this message. A validation
   * refusal is the buyer's own input to fix; everything else is the platform's
   * to hear about.
   */
  offerReport: boolean;
}

interface GqlErrorShape {
  message?: unknown;
  path?: unknown;
  extensions?: { code?: unknown } | null;
}

interface ApiErrorShape {
  message?: unknown;
  graphQLErrors?: GqlErrorShape[] | null;
  networkError?: { message?: unknown } | null;
  /** Native's ApiError carries GraphQL extensions directly. */
  extensions?: { code?: unknown } | null;
  code?: unknown;
  path?: unknown;
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** codes the server actually throws, mapped to behaviour-level kinds. */
const KIND_BY_CODE: Record<string, IssueKind> = {
  UNAUTHENTICATED: 'AUTH',
  FORBIDDEN: 'FORBIDDEN',
  BAD_USER_INPUT: 'VALIDATION',
  CHECKOUT_NOT_ELIGIBLE: 'VALIDATION',
  VERIFICATION_UNDER_REVIEW: 'VALIDATION',
  ALREADY_BOOKED: 'CONFLICT',
  CONFLICT: 'CONFLICT',
  NOT_FOUND: 'NOT_FOUND',
  CONFIG_ERROR: 'SERVER',
  INTERNAL_SERVER_ERROR: 'SERVER',
  BAD_GATEWAY: 'SERVER',
  AI_NOT_CONFIGURED: 'SERVER',
  AI_UPSTREAM_ERROR: 'SERVER',
};

const NETWORK_HINTS = ['failed to fetch', 'network request failed', 'load failed', 'networkerror'];

/**
 * Read any thrown value from a server operation into one structured issue.
 *
 * `fallbackMessage` is the caller's localized "something went wrong" copy —
 * the parser itself ships no user-facing text (rule 38: copy lives in the
 * bundles, and each surface passes its own).
 */
export function parseIssue(
  err: unknown,
  opts?: { operation?: string | null; fallbackMessage?: string }
): ParsedIssue {
  const fallback = opts?.fallbackMessage ?? 'Something went wrong. Please try again.';
  const operation = opts?.operation ?? null;
  const shaped = (err ?? {}) as ApiErrorShape;

  const gql = Array.isArray(shaped.graphQLErrors) ? shaped.graphQLErrors[0] : undefined;
  if (gql) {
    const code = text(gql.extensions?.code) || null;
    const kind: IssueKind = (code && KIND_BY_CODE[code]) || 'SERVER';
    const path = Array.isArray(gql.path) ? gql.path.map(String).join('.') : null;
    return {
      kind,
      code,
      message: text(gql.message) || fallback,
      operation,
      path,
      offerReport: kind !== 'VALIDATION',
    };
  }

  // graphql-request is normalised into the native ApiError shape, where the
  // first GraphQL error's extensions live directly on the thrown error. Keep
  // its code intact so native screens can take the same action as mWeb.
  const directCode = text(shaped.extensions?.code) || text(shaped.code) || null;
  if (directCode) {
    const kind: IssueKind = KIND_BY_CODE[directCode] || 'SERVER';
    const path = Array.isArray(shaped.path)
      ? shaped.path.map(String).join('.')
      : text(shaped.path) || null;
    return {
      kind,
      code: directCode,
      message: text(shaped.message) || fallback,
      operation,
      path,
      offerReport: kind !== 'VALIDATION',
    };
  }

  const message = text(shaped.message) || text(shaped.networkError?.message);
  const lower = message.toLowerCase();
  if (shaped.networkError || NETWORK_HINTS.some((hint) => lower.includes(hint))) {
    return {
      kind: 'NETWORK',
      code: null,
      // A transport failure's own message is jargon; the caller's copy is not.
      message: fallback,
      operation,
      path: null,
      offerReport: true,
    };
  }

  return {
    kind: 'UNKNOWN',
    code: null,
    message: message || fallback,
    operation,
    path: null,
    offerReport: true,
  };
}
