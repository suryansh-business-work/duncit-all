/// <reference types="cypress" />
import {
  E2E_ONE_TIME_CODE_QUERY,
  E2E_TRAFFIC_HEADER,
  E2E_TRAFFIC_KEY_QUERY,
  type E2eCodePurpose,
} from '@duncit/utils';
import { LOGIN_MUTATION } from './operations';

/**
 * The live suite's commands — the mWeb suite's, speaking as the Partners
 * console. Nothing here stubs the app's GraphQL: `gql` talks to the real API,
 * `apiLogin` turns a real password into the token the portal reads from
 * localStorage, `readOtp` asks the OTP testing API for the code the run account
 * was sent, and `interceptOperation` only WATCHES a request so a spec can wait
 * for the server's answer.
 *
 * There is no purge here on purpose: the account belongs to the mWeb suite,
 * which removes it at the end of its own delete spec.
 */

type GqlVariables = Record<string, unknown>;

/** A held code's destination: a mailbox, or a WhatsApp number. */
export interface CodeTarget {
  email?: string;
  phone?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** POST one operation to the real API and yield its `data`. A GraphQL error fails the test. */
      gql<T = any>(query: string, variables?: GqlVariables, options?: { token?: string | null }): Chainable<T>;
      /** POST one operation that must be refused, and yield the first error's message. */
      gqlError(query: string, variables?: GqlVariables, options?: { token?: string | null }): Chainable<string>;
      /** The same as `gql`, signed with the staging release token (the OTP testing API). */
      staffGql<T = any>(query: string, variables?: GqlVariables): Chainable<T>;
      /** Tag every app request with the run's traffic key, so its sign-ins skip the rate limit. */
      useRunTraffic(): Chainable<void>;
      /** When the newest held code for this purpose was issued, or '' when none has been. */
      lastOtpIssuedAt(purpose: E2eCodePurpose, target: CodeTarget): Chainable<string>;
      /** Wait for a held code issued after `after` (from `lastOtpIssuedAt`) and yield it. */
      readOtp(purpose: E2eCodePurpose, target: CodeTarget, after?: string): Chainable<string>;
      /** Sign in to Partners through the API and keep the token for the next `visitApp`. */
      apiLogin(email: string, password: string): Chainable<string>;
      /** Forget the token so the next `visitApp` boots signed out. */
      clearAuth(): Chainable<void>;
      /** `cy.visit` with the current token applied. */
      visitApp(path: string): Chainable<AUTWindow>;
      /** The form control associated with a `<label>` (label-first field lookup). */
      fieldByLabel(label: string | RegExp): Chainable<JQuery<HTMLElement>>;
      /** Alias the next request carrying this operation so `cy.wait('@Name')` waits for the real answer. */
      interceptOperation(name: string, alias?: string): Chainable<void>;
    }
  }
}

const TOKEN_KEY = '__liveToken';
const TRAFFIC_KEY = '__trafficKey';
const DUID = 'e2e-live-duid';
const OTP_POLL_MS = 1000;
const OTP_POLL_TRIES = 30;
/** The console's key: its `portal_key` on sign-in and its `x-duncit-app` header. */
const PORTAL_KEY = 'partners';

const graphqlUrl = (): string => String(Cypress.env('GRAPHQL_URL'));
const operationName = (query: string): string => /(?:query|mutation)\s+(\w+)/.exec(query)?.[1] ?? 'operation';

type GqlBody = { data?: unknown; errors?: { message: string }[] };

function send(query: string, variables: GqlVariables, token: string | null): Cypress.Chainable<Cypress.Response<GqlBody>> {
  // What @duncit/shell's createApolloClient sends for this console.
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-duncit-surface': 'PORTAL',
    'x-duncit-app': PORTAL_KEY,
    'x-duid': DUID,
  };
  if (token) headers.authorization = `Bearer ${token}`;
  const traffic = Cypress.env(TRAFFIC_KEY) as string | undefined;
  if (traffic) headers[E2E_TRAFFIC_HEADER] = traffic;
  // log: false — the staff token must never appear in the command log or the video.
  return cy.request<GqlBody>({
    method: 'POST',
    url: graphqlUrl(),
    headers,
    body: { query, variables },
    failOnStatusCode: false,
    log: false,
  });
}

function post<T>(query: string, variables: GqlVariables, token: string | null): Cypress.Chainable<T> {
  const operation = operationName(query);
  return send(query, variables, token).then((res) => {
    const errors = res.body?.errors;
    if (Array.isArray(errors) && errors.length > 0) throw new Error(`${operation} failed: ${errors[0].message}`);
    if (res.status !== 200) throw new Error(`${operation} answered HTTP ${res.status}`);
    // Wrapped, so `then` yields the generic `T` rather than Cypress's ThenReturn union.
    return cy.wrap(res.body.data as T, { log: false });
  });
}

const tokenFor = (options: { token?: string | null }): string | null =>
  options.token === undefined ? (Cypress.env(TOKEN_KEY) as string | null) : options.token;

Cypress.Commands.add('gql', (query: string, variables: GqlVariables = {}, options = {}) =>
  post(query, variables, tokenFor(options)),
);

Cypress.Commands.add('gqlError', (query: string, variables: GqlVariables = {}, options = {}) => {
  const operation = operationName(query);
  return send(query, variables, tokenFor(options)).then((res) => {
    const message = res.body?.errors?.[0]?.message;
    if (!message) throw new Error(`${operation} was expected to be refused, but it answered without an error.`);
    return message;
  });
});

Cypress.Commands.add('staffGql', (query: string, variables: GqlVariables = {}) => {
  const token = String(Cypress.env('E2E_RELEASE_TOKEN') ?? '');
  if (!token) throw new Error('CYPRESS_E2E_RELEASE_TOKEN is not set: the OTP testing API needs the staging release token.');
  return post(query, variables, token);
});

Cypress.Commands.add('useRunTraffic', () => {
  const tag = (key: string) => {
    cy.intercept({ method: 'POST', url: graphqlUrl() }, (req) => {
      req.headers[E2E_TRAFFIC_HEADER] = key;
    });
  };
  const known = Cypress.env(TRAFFIC_KEY) as string | undefined;
  if (known) {
    tag(known);
    return;
  }
  cy.staffGql<{ e2eTrafficKey: string }>(E2E_TRAFFIC_KEY_QUERY, { stamp: Cypress.env('E2E_STAMP') }).then((data) => {
    Cypress.env(TRAFFIC_KEY, data.e2eTrafficKey);
    tag(data.e2eTrafficKey);
  });
});

type HeldCode = { e2eOneTimeCode: { code: string; issued_at: string } | null };

Cypress.Commands.add('lastOtpIssuedAt', (purpose: E2eCodePurpose, target: CodeTarget) =>
  cy
    .staffGql<HeldCode>(E2E_ONE_TIME_CODE_QUERY, { purpose, ...target })
    .then((data) => data.e2eOneTimeCode?.issued_at ?? ''),
);

Cypress.Commands.add('readOtp', (purpose: E2eCodePurpose, target: CodeTarget, after = '') => {
  const attempt = (triesLeft: number): Cypress.Chainable<string> =>
    cy.staffGql<HeldCode>(E2E_ONE_TIME_CODE_QUERY, { purpose, ...target }).then((data) => {
      const held = data.e2eOneTimeCode;
      if (held && held.issued_at !== after) return cy.wrap(held.code, { log: false });
      if (triesLeft <= 0) throw new Error(`No ${purpose} code was held for the run account.`);
      return cy.wait(OTP_POLL_MS, { log: false }).then(() => attempt(triesLeft - 1));
    });
  return attempt(OTP_POLL_TRIES);
});

Cypress.Commands.add('apiLogin', (email: string, password: string) =>
  cy
    .gql<{ login: { token: string } }>(LOGIN_MUTATION, { input: { email, password, portal_key: PORTAL_KEY } }, { token: null })
    .then((data) => {
      Cypress.env(TOKEN_KEY, data.login.token);
      return data.login.token;
    }),
);

Cypress.Commands.add('clearAuth', () => {
  Cypress.env(TOKEN_KEY, null);
});

Cypress.Commands.add('visitApp', (path: string) => {
  const token = Cypress.env(TOKEN_KEY) as string | null;
  return cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('duncit_duid', DUID);
      // The key portals/partners-app/src/config/app-config.ts names as `tokenKey`.
      if (token) {
        win.localStorage.setItem('token', token);
      } else {
        win.localStorage.removeItem('token');
      }
    },
  });
});

Cypress.Commands.add('fieldByLabel', (label: string | RegExp) =>
  cy.contains('label', label).then(($label) => {
    const id = $label.attr('for');
    // MUI ids come from React's useId (`:r1:`) — never usable as a CSS #id.
    expect(id, `label "${String(label)}" is bound to a control`).to.be.a('string').and.not.be.empty;
    return cy.get(`[id="${id}"]`);
  }),
);

Cypress.Commands.add('interceptOperation', (name: string, alias?: string) => {
  cy.intercept({ method: 'POST', url: graphqlUrl() }, (req) => {
    if ((req.body as { operationName?: string } | undefined)?.operationName === name) req.alias = alias ?? name;
  });
});

export {};
