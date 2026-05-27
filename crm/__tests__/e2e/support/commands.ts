/// <reference types="cypress" />

import { TEST_USER } from '../test.config';

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
      mockGraphql(map: GraphQLMockMap): Chainable<void>;
      login(opts?: { email?: string; password?: string }): Chainable<void>;
      seedAuth(token?: string): Chainable<void>;
      /**
       * Open a MUI `select` (or multi-select) located by its floating label
       * text, then click an option whose text matches `optionText`.
       */
      pickMuiOption(labelText: RegExp | string, optionText: RegExp | string): Chainable<void>;
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
  Cypress.env('__gqlMock', {});

  // Always satisfy the CORS preflight that Apollo fires before a cross-origin
  // POST. The actual POST is intercepted below; we just need OPTIONS not to
  // hit the real server.duncit.com (which doesn't allow localhost origins).
  cy.intercept({ method: 'OPTIONS', url: '**/graphql' }, (req) => {
    req.reply({
      statusCode: 204,
      headers: {
        'access-control-allow-origin': req.headers['origin'] ?? '*',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'authorization,content-type,x-duid',
        'access-control-allow-credentials': 'true',
      },
    });
  });
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
  // CRM stores its auth token at localStorage[`crm_token`] (see appConfig).
  cy.window().then((win) => {
    win.localStorage.setItem('crm_token', token);
  });
});

Cypress.Commands.add('login', (opts) => {
  const email = opts?.email ?? TEST_USER.email;
  const password = opts?.password ?? TEST_USER.password;
  cy.visit('/login');
  // The login form uses Formik with MUI TextField fields whose `name`
  // attribute is `email` / `password`. That's a far more reliable selector
  // than going via the floating label.
  cy.get('input[name="email"]').should('be.visible').clear().type(email);
  cy.get('input[name="password"]').should('be.visible').clear().type(password, { log: false });
  cy.get('button[type="submit"]').should('not.be.disabled').click();
  cy.location('pathname', { timeout: 10000 }).should('not.eq', '/login');
});

Cypress.Commands.add('pickMuiOption', (labelText: RegExp | string, optionText: RegExp | string) => {
  // MUI's TextField/Select renders the floating label as a `<label>` whose
  // sibling MuiFormControl-root contains the actual `[role="combobox"]`
  // trigger. Locating the field via its visible label is far more robust
  // than going by `name` (which sits on a hidden inner input) — works
  // identically for single-select TextField and Select(multiple).
  const re = typeof labelText === 'string' ? new RegExp(labelText, 'i') : labelText;
  cy.contains('label', re)
    .closest('.MuiFormControl-root, .MuiTextField-root')
    .find('[role="combobox"]')
    .first()
    .click({ force: true });
  cy.get('[role="listbox"]').should('be.visible');
  cy.get('[role="listbox"] [role="option"]').contains(optionText).click();
  // For multi-select the menu stays open after picking — pressing Escape
  // dismisses it so subsequent field interactions aren't blocked.
  cy.get('body').type('{esc}');
});

export {};
