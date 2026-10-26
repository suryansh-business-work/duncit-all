/// <reference types="cypress" />
import { NO_ID } from './staff-operations';

/**
 * Shared steps for the "other" API specs (specs/api/other/**): the REST routes,
 * webhooks, probes and signed links the server mounts beside /graphql
 * (server/src/index.ts). Every request goes to the real server under test,
 * never stubbed, and never fails the command on its status — the status IS
 * what these specs assert.
 */

/** A GraphQL answer with the detail `validate()` adds (server/src/utils/validate.ts). */
export interface GqlAnswer {
  data?: Record<string, unknown> | null;
  errors?: Array<{ message: string; extensions?: { code?: string; errors?: string[] } }>;
}

/** The API's origin, derived from the GraphQL URL the suite already runs against. */
export const serverOrigin = (): string => new URL(String(Cypress.env('GRAPHQL_URL'))).origin;

/** The GraphQL endpoint itself. */
export const graphqlUrl = (): string => String(Cypress.env('GRAPHQL_URL'));

type RequestInit = Omit<Partial<Cypress.RequestOptions>, 'method' | 'url'>;

/**
 * One request to a server route, answered as it came: no redirect followed, no
 * failure on a 4xx/5xx, and nothing logged (some of these carry a token).
 */
export function rest<T = unknown>(
  method: string,
  path: string,
  init: RequestInit = {},
): Cypress.Chainable<Cypress.Response<T>> {
  return cy.request<T>({
    method,
    url: `${serverOrigin()}${path}`,
    failOnStatusCode: false,
    followRedirect: false,
    log: false,
    ...init,
  });
}

/** A raw HTTP request to /graphql, for the transport rules (CSRF, GET, depth) `cy.gqlRaw` cannot shape. */
export function graphqlHttp(init: Omit<Partial<Cypress.RequestOptions>, 'url'>): Cypress.Chainable<Cypress.Response<GqlAnswer>> {
  return cy.request<GqlAnswer>({
    url: graphqlUrl(),
    failOnStatusCode: false,
    log: false,
    ...init,
    // JSON, so Apollo never answers with its landing page instead of the operation.
    headers: { accept: 'application/json', ...init.headers },
  });
}

/** The first error's code and message, or a failure naming `what` when there is none. */
export function firstError(body: GqlAnswer, what: string): { code?: string; message: string; errors?: string[] } {
  const [error] = body.errors ?? [];
  expect(error, `${what} must answer with an error`).to.exist;
  return { code: error.extensions?.code, message: error.message, errors: error.extensions?.errors };
}

const base64url = (text: string): string =>
  btoa(text).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

/**
 * A token in the server's signed-link shape (server/src/utils/signed-link.ts:
 * `<base64url {i, e}>.<base64url HMAC-SHA256>`), naming no record, an hour from
 * expiry, with a signature of the right length that nobody made. Every route
 * guarded by a signed link must treat it exactly like no token at all.
 */
export const forgedSignedLink = (): string =>
  `${base64url(JSON.stringify({ i: NO_ID, e: Date.now() + 3_600_000 }))}.${'A'.repeat(43)}`;

/** The body a route answering text/plain sent, as a string. */
export const textOf = (body: unknown): string => (typeof body === 'string' ? body : JSON.stringify(body));
