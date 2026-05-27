/// <reference types="cypress" />

/**
 * Map of GraphQL operationName → response builder. Builders can be either a
 * static GraphQL response or a function that takes the request variables
 * and returns a response. Each spec registers its own map via
 * `cy.mockGraphql(...)` so behaviour stays isolated.
 */
export type GraphQLMockMap = Record<
  string,
  | { data?: unknown; errors?: { message: string; extensions?: Record<string, unknown> }[] }
  | ((variables: Record<string, unknown>) => {
      data?: unknown;
      errors?: { message: string; extensions?: Record<string, unknown> }[];
    })
>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Register a single `**\/graphql` intercept that dispatches by
       * `operationName` against the supplied map. Subsequent calls within
       * the same test merge into the same intercept (last-write-wins per
       * operation name) so a base mock can be extended per spec.
       */
      mockGraphql(map: GraphQLMockMap): Chainable<void>;

      /**
       * Hit `/login`, fill the form with the supplied creds (defaulting to
       * the test admin), and wait for the redirect away from /login. The
       * `ConsoleLogin` mutation itself must be intercepted via
       * `mockGraphql` before this command is called.
       */
      login(opts?: { email?: string; password?: string }): Chainable<void>;

      /** Seed `localStorage` with a token so the app skips login entirely. */
      seedAuth(token?: string): Chainable<void>;

      /** Mirrors @testing-library's findByLabelText for MUI inputs. */
      findByLabelLike(label: RegExp | string): Chainable<JQuery<HTMLElement>>;
    }
  }
}

function loadCurrentMap(): GraphQLMockMap {
  return (Cypress.env('__gqlMock') as GraphQLMockMap | undefined) ?? {};
}

function saveCurrentMap(map: GraphQLMockMap) {
  Cypress.env('__gqlMock', map);
}

beforeEach(() => {
  // Reset between tests so the previous spec's mocks don't leak.
  Cypress.env('__gqlMock', {});
});

Cypress.Commands.add('mockGraphql', (map: GraphQLMockMap) => {
  const merged: GraphQLMockMap = { ...loadCurrentMap(), ...map };
  saveCurrentMap(merged);

  cy.intercept({ method: 'POST', url: '**/graphql' }, (req) => {
    const body = req.body as { operationName?: string; variables?: Record<string, unknown> };
    const opName = body?.operationName ?? '';
    const current = loadCurrentMap();
    const handler = current[opName];
    if (!handler) {
      req.reply({
        statusCode: 200,
        body: {
          errors: [
            { message: `No mock registered for operation '${opName}'`, extensions: { code: 'TEST_NO_MOCK' } },
          ],
        },
      });
      return;
    }
    const response = typeof handler === 'function' ? handler(body.variables ?? {}) : handler;
    req.reply({ statusCode: 200, body: response });
  }).as('graphql');
});

Cypress.Commands.add('seedAuth', (token = 'cypress-test-token') => {
  // The CRM app reads the token from localStorage[appConfig.tokenKey] which
  // for CRM is `crm_token`. Seeding it skips the login flow entirely.
  cy.window().then((win) => {
    win.localStorage.setItem('crm_token', token);
  });
});

Cypress.Commands.add('login', (opts) => {
  const email = opts?.email ?? 'admin@duncit.com';
  const password = opts?.password ?? '12345678';
  cy.visit('/login');
  cy.findByLabelLike(/email/i).type(email);
  cy.findByLabelLike(/password/i).type(password);
  cy.contains('button', /open crm console/i).click();
  cy.location('pathname', { timeout: 10000 }).should('not.eq', '/login');
});

Cypress.Commands.add('findByLabelLike', (label) => {
  const re = typeof label === 'string' ? new RegExp(`^${label}$`, 'i') : label;
  cy.get('label').contains(re).then(($label) => {
    const forId = $label.attr('for');
    if (forId) {
      // Use a chained `.then` rather than returning a Chainable from this
      // outer .then — Cypress only accepts a single returned Chainable.
      cy.get(`#${forId}`);
    } else {
      cy.wrap($label).siblings('input,textarea').first();
    }
  });
});

export {};
