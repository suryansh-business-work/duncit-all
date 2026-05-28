/// <reference types="cypress" />

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
      seedAuth(token?: string): Chainable<void>;
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

  // Satisfy the CORS preflight Apollo fires before a cross-origin POST so the
  // OPTIONS never hits the real server.
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
        body: { errors: [{ message: `No mock registered for operation '${opName}'`, extensions: { code: 'TEST_NO_MOCK' } }] },
      });
      return;
    }
    const response = typeof handler === 'function' ? handler(body.variables ?? {}) : handler;
    req.reply({ statusCode: 200, body: response });
  }).as('graphql');
});

Cypress.Commands.add('seedAuth', (token = 'cypress-test-token') => {
  cy.window().then((win) => {
    win.localStorage.setItem('ai_token', token);
  });
});

export {};
